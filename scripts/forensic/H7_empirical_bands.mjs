#!/usr/bin/env node
/**
 * H7 — Empirical bands lift STRONG-band performance
 *
 * Hypothesis: replacing hard-coded score thresholds with empirical percentile
 * cuts (top/bottom 5%, 10%, 20% of observed score distribution) materially
 * lifts STRONG-band alpha. Pairs with H8 (saturation).
 *
 * Method:
 *   1. Pull 24h outcomes joined to token_signals.score.
 *   2. Compute current STRONG_SELL band performance: signals with band=STRONG_SELL
 *      → mean alpha, n.
 *   3. For each quantile q in {5,10,20}, take the bottom-q% of scores
 *      (most-negative scores ⇒ strongest SELL conviction). Compute mean
 *      alpha and n for that empirical bucket.
 *   4. Compare each empirical bucket's mean alpha to current STRONG_SELL.
 *      "Lift" = current_mean_alpha − new_mean_alpha (positive bps = new
 *      bucket is more negative = better SELL).
 *
 * PASS: any quantile in {5%,10%,20%} delivers lift ≥ 300 bps AND n_new ≥ 100
 * KILL: no quantile improves on current (lift ≤ 0)
 * INCONCLUSIVE: otherwise.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, mean, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H7 — Empirical bands'
const QUANTILES = [0.05, 0.10, 0.20]

function quantile(sorted, q) {
  if (!sorted.length) return null
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * sorted.length)))
  return sorted[idx]
}

async function main() {
  const client = makeClient()
  console.log('[H7] fetching 24h outcomes + scores + bands')

  const outcomes = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_id, signal_type, alpha_pct, price_change_pct')
    .eq('suspect', false)
    .eq('eval_window', '24h')
    .not('correct', 'is', null)
    .gte('signal_time', FORENSIC_WINDOW_START))

  const ids = [...new Set(outcomes.map(o => o.signal_id).filter(Boolean))]
  const sigById = new Map()
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500)
    const { data, error } = await client
      .from('token_signals')
      .select('id, score')
      .in('id', batch)
    if (error) throw error
    for (const r of (data || [])) sigById.set(r.id, r)
  }

  // Build joined rows
  const rows = []
  for (const o of outcomes) {
    const s = sigById.get(o.signal_id)
    if (!s) continue
    const target = Number.isFinite(o.alpha_pct) ? o.alpha_pct : o.price_change_pct
    if (!Number.isFinite(target) || !Number.isFinite(s.score)) continue
    rows.push({ score: s.score, signal_type: o.signal_type, alpha: target })
  }

  // Current STRONG_SELL benchmark
  const currentStrongSells = rows.filter(r => r.signal_type === 'STRONG SELL').map(r => r.alpha)
  const currentMean = currentStrongSells.length ? mean(currentStrongSells) : null
  const currentN = currentStrongSells.length

  // Empirical quantile cuts (most-negative scores)
  const scoresSorted = rows.map(r => r.score).sort((a, b) => a - b)
  const buckets = QUANTILES.map(q => {
    const cut = quantile(scoresSorted, q)
    const subset = rows.filter(r => r.score <= cut).map(r => r.alpha)
    return {
      quantile_pct: q * 100,
      cut_score: cut,
      n: subset.length,
      mean_alpha: subset.length ? mean(subset) : null,
      lift_pp: (currentMean != null && subset.length)
        ? (currentMean - mean(subset))
        : null,
    }
  })

  // Find best lift among quantiles with n >= 100
  const eligible = buckets.filter(b => b.n >= 100 && b.lift_pp != null)
  const best = eligible.length
    ? eligible.reduce((a, b) => (b.lift_pp > a.lift_pp ? b : a))
    : null

  let verdict, summary
  if (currentN < 50 || rows.length < 200) {
    verdict = 'INCONCLUSIVE'
    summary = `current STRONG_SELL n=${currentN}, total n=${rows.length} insufficient`
  } else if (best && best.lift_pp >= 3.0) {
    verdict = 'PASS'
    summary = `${best.quantile_pct}%-empirical bucket lifts STRONG_SELL by ${best.lift_pp.toFixed(2)}pp (current mean α=${currentMean.toFixed(3)}, new mean α=${(currentMean - best.lift_pp).toFixed(3)}, n_new=${best.n})`
  } else if (buckets.every(b => b.lift_pp == null || b.lift_pp <= 0)) {
    verdict = 'KILL'
    summary = `no empirical bucket improves on current STRONG_SELL (lifts: ${buckets.map(b => b.lift_pp != null ? b.lift_pp.toFixed(2) : 'NA').join(', ')} pp)`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `best lift ${best ? best.lift_pp.toFixed(2) + 'pp at ' + best.quantile_pct + '% (n=' + best.n + ')' : 'none with n>=100'} — between thresholds`
  }

  writeResult('H7_empirical_bands', {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    total_rows: rows.length,
    current_strong_sell: { n: currentN, mean_alpha: currentMean },
    empirical_buckets: buckets,
    verdict,
    summary,
  })
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H7_empirical_bands.json' })
  console.log(`[H7] ${verdict} — ${summary}`)
}

main().catch(err => { console.error(err); process.exit(1) })
