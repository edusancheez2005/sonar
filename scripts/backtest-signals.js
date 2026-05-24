#!/usr/bin/env node
/**
 * Signal-research backtest harness (§4.F deliverable 3).
 * =============================================================================
 * Pulls historical (whale flow + price + sentiment) snapshots from Supabase,
 * runs each candidate family against each snapshot, joins the firings to
 * forward returns from signal_outcomes / token_signals (suspect=FALSE only),
 * and writes a row to `signal_research_results` per (family, window).
 *
 * THIS SCRIPT DOES NOT PROMOTE ANY FAMILY TO PRODUCTION. It only populates
 * the research table. A human reads it, decides go/no-go, and (if go) opens
 * a separate PR that adds the family to compute-signals/route.js with a
 * circuit-breaker entry per the existing signal_circuit_breaker pattern.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/backtest-signals.js \
 *     [--family <name>] [--window 24h|3d|7d] [--since YYYY-MM-DD] [--dry-run]
 *
 * Exit codes:
 *   0 — wrote results (or dry-run completed)
 *   2 — bad env / args
 *   3 — DB read or write failed
 */
const { createClient } = require('@supabase/supabase-js')
const {
  evaluateAllFamilies,
  SIGNAL_FAMILIES,
} = require('../dist/lib/signal-research/families.cjs') // fallback below
const { summarise, meetsPromotionBar } = require('../dist/lib/signal-research/metrics.cjs')

// We intentionally do NOT ship a compiled bundle as part of this PR — the
// require() above is the future shape. For now, run via tsx/ts-node OR
// transpile-on-the-fly. The pure-fn modules are tested separately and the
// glue logic below is the only untested code path; running this against
// production data should be done by a human after `npm run build`.

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }
  const sb = createClient(url, key)

  const sinceIso = args.since
    ? new Date(args.since).toISOString()
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  console.log(`[backtest] fetching snapshots since ${sinceIso}`)

  // Pull the lightweight join we need. We rely on signal_outcomes having
  // suspect=FALSE rows joined to token_signals for the source-of-truth
  // forward returns (return_24h / return_3d / return_7d).
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

  for (const row of outcomes) {
    // `snapshot_inputs` is the FamilyInput shape (or null on legacy rows).
    const input = row.snapshot_inputs
    if (!input) continue
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
        window: w,
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
