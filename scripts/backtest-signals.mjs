#!/usr/bin/env node
/**
 * Signal-research backtest harness (§4.F deliverable 3 — Workstream C).
 * =============================================================================
 * PR-2 rewrite (2026-05-24). See docs/SCHEMA_GAP_4F.md.
 *
 * Uses --experimental-strip-types (Node 22.6+) to import lib/signal-research/
 * TS modules directly. Same pattern as scripts/test-signal-engine.mjs.
 *
 * Pipeline:
 *   1. Pull signal_outcomes (eval_window='24h', suspect=false, correct not
 *      null, signal_time >= --since). The 24h `price_change_pct` is the
 *      forward return.
 *   2. Join (in JS) to token_signals.snapshot_inputs via signal_id. Skip
 *      legacy rows where snapshot_inputs is null (only post-PR-1b signals
 *      carry it).
 *   3. Compute trailing 30d net_flow stats per token from the joined
 *      snapshot history at each signal's emission time (forward-only — no
 *      look-ahead). These populate FamilyInput.net_flow_abs_mean_30d /
 *      _std_30d which Family B requires.
 *   4. Evaluate every family from lib/signal-research/families.ts against
 *      each row. Bucket by family. Direction-normalise the return
 *      ('short' signals get the sign flipped so positive = "right call").
 *   5. Summarise per family, label against the §4.F promotion bar
 *      (n>=200 AND 24h win_rate>=0.60), write one row per family to
 *      signal_research_results with window_label='24h'.
 *
 * THIS SCRIPT DOES NOT PROMOTE ANY FAMILY TO PRODUCTION. It only populates
 * the research table. A human reads it, decides go/no-go.
 *
 * Usage:
 *   npm run backtest:signals -- --dry-run
 *   npm run backtest:signals -- --family A --since 2026-06-01
 *
 * Exit codes:
 *   0 — wrote results (or dry-run completed)
 *   2 — bad env / args
 *   3 — DB read or write failed, or no clean outcomes in window
 *   4 — no rows with snapshot_inputs yet (PR-1b just shipped, wait for data)
 */
import { createClient } from '@supabase/supabase-js'
import { evaluateAllFamilies, SIGNAL_FAMILIES } from '../lib/signal-research/families.ts'
import { summarise, meetsPromotionBar } from '../lib/signal-research/metrics.ts'

const WINDOW = '24h'                    // only window with both data and a promotion bar
const TRAILING_DAYS = 30
const TRAILING_MS = TRAILING_DAYS * 24 * 60 * 60 * 1000
const PAGE = 1000                       // postgrest range cap

async function main() {
  const args = parseArgs(process.argv.slice(2))
  // Accept either SUPABASE_URL (script convention) or NEXT_PUBLIC_SUPABASE_URL (app convention).
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[backtest] missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }
  const sb = createClient(url, key, { auth: { persistSession: false } })

  const sinceIso = args.since
    ? new Date(args.since).toISOString()
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  console.log(`[backtest] window=${WINDOW} since=${sinceIso}`)

  // ── 1. Paged pull of clean 24h outcomes ────────────────────────────────
  const outcomes = await fetchAll(() => sb
    .from('signal_outcomes')
    .select('signal_id, token, signal_time, price_change_pct')
    .eq('suspect', false)
    .eq('eval_window', WINDOW)
    .not('correct', 'is', null)
    .gte('signal_time', sinceIso)
    .order('signal_time', { ascending: true }))
  console.log(`[backtest] ${outcomes.length} clean ${WINDOW} outcomes loaded`)
  if (outcomes.length === 0) {
    console.error('[backtest] no clean outcomes in window — nothing to score')
    process.exit(3)
  }

  // ── 2. Batch-fetch matching token_signals snapshots ────────────────────
  const signalIds = [...new Set(outcomes.map(o => o.signal_id).filter(Boolean))]
  console.log(`[backtest] joining ${signalIds.length} unique token_signals`)
  const snapshotById = new Map()
  for (let i = 0; i < signalIds.length; i += 500) {
    const batch = signalIds.slice(i, i + 500)
    const { data, error } = await sb
      .from('token_signals')
      .select('id, token, computed_at, snapshot_inputs')
      .in('id', batch)
    if (error) {
      console.error('[backtest] token_signals fetch failed', error)
      process.exit(3)
    }
    for (const r of (data || [])) snapshotById.set(r.id, r)
  }

  const rowsWithSnap = outcomes
    .map(o => ({ ...o, snap: snapshotById.get(o.signal_id) }))
    .filter(r => r.snap && r.snap.snapshot_inputs)
  console.log(`[backtest] ${rowsWithSnap.length} rows have snapshot_inputs`)
  if (rowsWithSnap.length === 0) {
    console.error('[backtest] zero rows with snapshot_inputs — PR-1b writer not deployed long enough')
    console.error('  see docs/SCHEMA_GAP_4F.md PR-3 (wait window)')
    process.exit(4)
  }

  // ── 3. Compute trailing 30d |net_flow| stats per token (forward-only) ──
  // For each token, sort its snapshots chronologically. At each row, build
  // the trailing window from snapshots strictly BEFORE this row's
  // computed_at (forward-only ⇒ no look-ahead). Used for Family B's
  // net-flow z-score gate.
  const byToken = new Map()
  for (const r of rowsWithSnap) {
    const t = r.snap.token
    if (!byToken.has(t)) byToken.set(t, [])
    byToken.get(t).push(r)
  }
  for (const list of byToken.values()) {
    list.sort((a, b) => new Date(a.snap.computed_at) - new Date(b.snap.computed_at))
    const flows = []      // |net_flow| values in chronological order
    const times = []      // matching computed_at epoch ms
    let head = 0
    for (let i = 0; i < list.length; i++) {
      const row = list[i]
      const tNow = new Date(row.snap.computed_at).getTime()
      const cutoff = tNow - TRAILING_MS
      // Append PREVIOUS row's flow before evaluating this row.
      if (i > 0) {
        const prev = list[i - 1]
        const f = prev.snap.snapshot_inputs?.net_whale_flow_usd
        if (Number.isFinite(f)) {
          flows.push(Math.abs(f))
          times.push(new Date(prev.snap.computed_at).getTime())
        }
      }
      // Drop entries older than the trailing window.
      while (head < times.length && times[head] < cutoff) head++
      const win = flows.slice(head)
      if (win.length >= 5) {
        const n = win.length
        const mean = win.reduce((a, b) => a + b, 0) / n
        let s2 = 0
        for (const v of win) s2 += (v - mean) ** 2
        row.mu30 = mean
        row.sigma30 = Math.sqrt(s2 / Math.max(n - 1, 1))
      } else {
        row.mu30 = null
        row.sigma30 = null
      }
    }
  }

  // ── 4. Evaluate families, bucket returns ───────────────────────────────
  const familyFilter = args.family || null
  const buckets = {}
  for (const name of Object.keys(SIGNAL_FAMILIES)) buckets[name] = []

  let firedCount = 0
  for (const r of rowsWithSnap) {
    const fi = {
      ...r.snap.snapshot_inputs,
      net_flow_abs_mean_30d: r.mu30 ?? null,
      net_flow_abs_std_30d: r.sigma30 ?? null,
      suspect: false,                            // already filtered
    }
    const evald = evaluateAllFamilies(fi)
    for (const [name, out] of Object.entries(evald)) {
      if (familyFilter && name !== familyFilter) continue
      if (!out || out.direction === null) continue
      const raw = r.price_change_pct
      if (!Number.isFinite(raw)) continue
      const ret = out.direction === 'long' ? raw : -raw
      buckets[name].push({ return_pct: ret })
      firedCount++
    }
  }
  console.log(`[backtest] evaluated ${rowsWithSnap.length} rows → ${firedCount} fired family signals`)

  // ── 5. Summarise + write ───────────────────────────────────────────────
  const rowsToInsert = []
  for (const [name, obs] of Object.entries(buckets)) {
    if (familyFilter && name !== familyFilter) continue
    const summary = summarise(obs)
    const gate = meetsPromotionBar(summary, WINDOW)
    const notes = gate.passes
      ? 'PASSES promotion bar — human review required'
      : `BELOW promotion bar: ${gate.reasons.join('; ')}`
    console.log(
      `[backtest] ${name} @ ${WINDOW}: n=${summary.n_samples} ` +
      `win=${summary.win_rate == null ? 'na' : (summary.win_rate * 100).toFixed(1) + '%'} ` +
      `avg=${summary.avg_pct == null ? 'na' : summary.avg_pct.toFixed(2) + '%'} → ${notes}`
    )
    rowsToInsert.push({
      signal_name: name,
      window_label: WINDOW,
      n_samples: summary.n_samples,
      win_rate: summary.win_rate,
      avg_pct: summary.avg_pct,
      sharpe_proxy: summary.sharpe_proxy,
      max_drawdown_proxy: summary.max_drawdown_proxy,
      params: { since: sinceIso, trailing_days: TRAILING_DAYS },
      notes,
      clean_only: true,
    })
  }

  if (args.dryRun) {
    console.log('[backtest] --dry-run set; not writing to signal_research_results')
    return
  }
  const { error: insErr } = await sb.from('signal_research_results').insert(rowsToInsert)
  if (insErr) {
    console.error('[backtest] write failed', insErr)
    process.exit(3)
  }
  console.log(`[backtest] wrote ${rowsToInsert.length} rows to signal_research_results`)
}

async function fetchAll(buildQuery) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) { console.error('[backtest] DB read failed', error); process.exit(3) }
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

function parseArgs(argv) {
  const out = { dryRun: false, family: null, since: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--family') out.family = argv[++i]
    else if (a === '--since') out.since = argv[++i]
    else if (a === '--window') { i++ /* harness is 24h-only in PR-2 */ }
  }
  return out
}

main().catch((err) => {
  console.error('[backtest] unexpected failure', err)
  process.exit(3)
})
