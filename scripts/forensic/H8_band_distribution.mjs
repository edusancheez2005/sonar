#!/usr/bin/env node
/**
 * H8 — STRONG bands almost never fire (tanh saturation)
 *
 * Hypothesis: STRONG_BUY (score ≥72) and STRONG_SELL (score ≤28) together
 * make up < 5% of all emitted signals because the tier composite tanh-
 * saturates each tier near ±1, capping rawScore well short of ±44.
 *
 * Method: count signal_type distribution in the forensic window.
 *
 * PASS:  STRONG_BUY% + STRONG_SELL% < 5%   → confirms saturation,
 *        recalibration of bands needed (feeds H7).
 * KILL:  STRONG_BUY% + STRONG_SELL% > 15%  → hypothesis wrong, bands
 *        already activating; the demote's culprit lies elsewhere.
 * INCONCLUSIVE: between 5% and 15%, OR n < 500.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H8 — STRONG band distribution'

async function main() {
  const client = makeClient()
  console.log(`[H8] fetching signal_outcomes since ${FORENSIC_WINDOW_START} (suspect=false, correct not null)`)

  const rows = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_type, eval_window')
    .eq('suspect', false)
    .not('correct', 'is', null)
    .gte('signal_time', FORENSIC_WINDOW_START)
    .order('signal_time'))

  // De-dup to one row per signal (each signal appears in up to 3 eval windows).
  // For band-share we only care about the signal_type, so any window is fine —
  // but we want each signal counted once. Group by signal_id? signal_id isn't
  // in the selection — pull it.
  const rowsWithId = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_id, signal_type')
    .eq('suspect', false)
    .not('correct', 'is', null)
    .gte('signal_time', FORENSIC_WINDOW_START)
    .order('signal_time'))

  const perSignal = new Map()
  for (const r of rowsWithId) {
    if (!perSignal.has(r.signal_id)) perSignal.set(r.signal_id, r.signal_type)
  }

  const counts = {}
  for (const t of perSignal.values()) {
    counts[t] = (counts[t] || 0) + 1
  }
  const n = perSignal.size

  const strongBuy = counts['STRONG BUY'] || 0
  const strongSell = counts['STRONG SELL'] || 0
  const strongShare = n > 0 ? (strongBuy + strongSell) / n : 0

  let verdict, summary
  if (n < 500) {
    verdict = 'INCONCLUSIVE'
    summary = `n=${n} < 500, insufficient sample`
  } else if (strongShare < 0.05) {
    verdict = 'PASS'
    summary = `STRONG combined share = ${(strongShare * 100).toFixed(2)}% < 5% (n=${n}) — tanh saturation confirmed`
  } else if (strongShare > 0.15) {
    verdict = 'KILL'
    summary = `STRONG combined share = ${(strongShare * 100).toFixed(2)}% > 15% (n=${n}) — bands are firing`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `STRONG combined share = ${(strongShare * 100).toFixed(2)}% (n=${n}) — between 5% and 15%`
  }

  const payload = {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    n_signals: n,
    distribution: counts,
    strong_buy_share: n > 0 ? strongBuy / n : 0,
    strong_sell_share: n > 0 ? strongSell / n : 0,
    strong_combined_share: strongShare,
    verdict,
    summary,
  }
  const path = writeResult('H8_band_distribution', payload)
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H8_band_distribution.json' })
  console.log(`[H8] ${verdict} — ${summary}`)
  console.log(`[H8] wrote ${path}`)
}

main().catch(err => { console.error(err); process.exit(1) })
