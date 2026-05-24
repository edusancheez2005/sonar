#!/usr/bin/env node
/**
 * Signal-research backtest harness (§4.F deliverable 3 — Workstream C).
 * =============================================================================
 * ESM port of scripts/backtest-signals.js. Uses --experimental-strip-types to
 * import the TS pure-fn modules directly (no `dist/` build step needed), the
 * same way scripts/test-signal-engine.mjs imports app/lib/signalEngine.ts.
 *
 * Pulls historical clean outcomes (suspect=FALSE) from `signal_outcomes`,
 * evaluates every candidate family from lib/signal-research/families.ts
 * against each row's `snapshot_inputs`, joins to forward returns, and
 * writes a row to `signal_research_results` per (family, window).
 *
 * THIS SCRIPT DOES NOT PROMOTE ANY FAMILY TO PRODUCTION. It only populates
 * the research table. A human reads it, decides go/no-go, and (if go) opens
 * a separate PR that adds the family to compute-signals/route.js with a
 * circuit-breaker entry per the existing signal_circuit_breaker pattern.
 *
 * Usage (Node 22.6+ required for --experimental-strip-types):
 *   $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."
 *   npm run backtest:signals -- --dry-run
 *   npm run backtest:signals -- --window 24h
 *   npm run backtest:signals -- --family A --since 2026-02-01
 *
 * Exit codes:
 *   0 — wrote results (or dry-run completed)
 *   2 — bad env / args
 *   3 — DB read or write failed
 */
import { createClient } from '@supabase/supabase-js'
import { evaluateAllFamilies, SIGNAL_FAMILIES } from '../lib/signal-research/families.ts'
import { summarise, meetsPromotionBar } from '../lib/signal-research/metrics.ts'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[backtest] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }
  const sb = createClient(url, key)

  const sinceIso = args.since
    ? new Date(args.since).toISOString()
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  console.log(`[backtest] fetching clean outcomes since ${sinceIso}`)

  // SCHEMA GUARD — see docs/SCHEMA_GAP_4F.md.
  // The harness assumes signal_outcomes carries return_24h/3d/7d AND a
  // snapshot_inputs JSONB. The real schema has neither (price_change_pct
  // keyed by eval_window, no snapshot_inputs anywhere). Until PR-1 and
  // PR-2 from SCHEMA_GAP_4F.md land, this script cannot produce honest
  // results — fail fast rather than silently insert zero-sample rows.
  console.error('[backtest] BLOCKED on schema gap — see docs/SCHEMA_GAP_4F.md')
  console.error('  signal_outcomes lacks return_24h / return_3d / return_7d')
  console.error('  signal_outcomes lacks snapshot_inputs (engine inputs are not persisted)')
  console.error('  Required: PR-1 (capture snapshot_inputs on token_signals)')
  console.error('  Required: PR-2 (rewrite harness against real schema)')
  console.error('  Required: PR-3 (wait ≥4 weeks for n≥200 clean samples)')
  process.exit(3)

  // eslint-disable-next-line no-unreachable -- retained for the post-PR-2 rewrite

  const { data: outcomes, error: outErr } = await sb
    .from('signal_outcomes')
    .select(
      'id, token, signal_time, return_24h, return_3d, return_7d, suspect, snapshot_inputs'
    )
    .eq('suspect', false)
    .gte('signal_time', sinceIso)
    .order('signal_time', { ascending: true })

  if (outErr) {
    console.error('[backtest] DB read failed', outErr)
    process.exit(3)
  }
  if (!outcomes || outcomes.length === 0) {
    console.error('[backtest] no clean outcomes found in window')
    process.exit(3)
  }
  console.log(`[backtest] ${outcomes.length} clean outcomes loaded`)

  const familyFilter = args.family || null
  const windowFilter = args.window || null

  /** @type {Record<string, Record<'24h'|'3d'|'7d', {return_pct:number}[]>>} */
  const buckets = {}
  for (const name of Object.keys(SIGNAL_FAMILIES)) {
    buckets[name] = { '24h': [], '3d': [], '7d': [] }
  }

  let skippedNoInput = 0
  for (const row of outcomes) {
    const input = row.snapshot_inputs
    if (!input) { skippedNoInput++; continue }
    const evald = evaluateAllFamilies({ ...input, suspect: row.suspect })
    for (const [name, out] of Object.entries(evald)) {
      if (familyFilter && name !== familyFilter) continue
      if (!out || out.direction === null) continue
      for (const w of ['24h', '3d', '7d']) {
        if (windowFilter && w !== windowFilter) continue
        const raw = row[`return_${w}`]
        if (typeof raw !== 'number') continue
        // Normalise: 'short' signals get the sign flipped so positive =
        // "the signal was right".
        const ret = out.direction === 'long' ? raw : -raw
        buckets[name][w].push({ return_pct: ret })
      }
    }
  }
  if (skippedNoInput > 0) {
    console.log(`[backtest] skipped ${skippedNoInput} outcomes with null snapshot_inputs (legacy rows)`)
  }

  const rowsToInsert = []
  for (const [name, byWindow] of Object.entries(buckets)) {
    for (const w of ['24h', '3d', '7d']) {
      const summary = summarise(byWindow[w])
      const gate = meetsPromotionBar(summary, w)
      const notes = gate.passes
        ? 'PASSES promotion bar — human review required'
        : `BELOW promotion bar: ${gate.reasons.join('; ')}`
      console.log(
        `[backtest] ${name} @ ${w}: n=${summary.n_samples} win=${summary.win_rate == null ? 'na' : (summary.win_rate * 100).toFixed(1) + '%'} avg=${summary.avg_pct == null ? 'na' : summary.avg_pct.toFixed(2) + '%'} → ${notes}`
      )
      rowsToInsert.push({
        signal_name: name,
        window_label: w,
        n_samples: summary.n_samples,
        win_rate: summary.win_rate,
        avg_pct: summary.avg_pct,
        sharpe_proxy: summary.sharpe_proxy,
        max_drawdown_proxy: summary.max_drawdown_proxy,
        params: {},
        notes,
        clean_only: true,
      })
    }
  }

  if (args.dryRun) {
    console.log('[backtest] --dry-run set; not writing to signal_research_results')
    return
  }

  const { error: insErr } = await sb
    .from('signal_research_results')
    .insert(rowsToInsert)
  if (insErr) {
    console.error('[backtest] write failed', insErr)
    process.exit(3)
  }
  console.log(`[backtest] wrote ${rowsToInsert.length} rows`)
}

function parseArgs(argv) {
  const out = { dryRun: false, family: null, window: null, since: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--family') out.family = argv[++i]
    else if (a === '--window') out.window = argv[++i]
    else if (a === '--since') out.since = argv[++i]
  }
  return out
}

main().catch((err) => {
  console.error('[backtest] unexpected failure', err)
  process.exit(3)
})
