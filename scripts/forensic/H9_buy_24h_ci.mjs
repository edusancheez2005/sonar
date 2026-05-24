#!/usr/bin/env node
/**
 * H9 — 24h BUY 5% win rate has CI excluding ≥30%
 *
 * Hypothesis: under the current engine, BUY signals evaluated at 24h have a
 * raw hit rate so low that even an exact (Clopper–Pearson) 95% upper CI
 * bound is below 30% — i.e. the BUY-side is statistically broken, not
 * just unlucky.
 *
 * Definition of "win": correct=true at eval_window='24h' for signal_type
 * IN ('BUY','STRONG BUY'), suspect=false, signal_time after the post-fix
 * forensic window start.
 *
 * PASS:  CI upper < 30%       → BUY side is structurally broken (matches the
 *                                production demote rationale).
 * KILL:  CI lower > 40%       → BUY side is fine; demote is too aggressive.
 * INCONCLUSIVE: anything else, or n < 50.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, binomialCI95, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H9 — 24h BUY win-rate CI'

async function main() {
  const client = makeClient()
  console.log(`[H9] fetching 24h BUY/STRONG BUY outcomes since ${FORENSIC_WINDOW_START}`)

  const rows = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_id, signal_type, correct, price_change_pct')
    .eq('suspect', false)
    .eq('eval_window', '24h')
    .in('signal_type', ['BUY', 'STRONG BUY'])
    .not('correct', 'is', null)
    .gte('signal_time', FORENSIC_WINDOW_START))

  const n = rows.length
  const k = rows.filter(r => r.correct === true).length
  const winRate = n > 0 ? k / n : 0
  const ci = binomialCI95(k, n)

  let verdict, summary
  if (n < 50) {
    verdict = 'INCONCLUSIVE'
    summary = `n=${n} < 50, insufficient sample`
  } else if (ci.hi < 0.30) {
    verdict = 'PASS'
    summary = `BUY 24h win=${(winRate * 100).toFixed(1)}% n=${n}, 95% CI upper=${(ci.hi * 100).toFixed(1)}% < 30%`
  } else if (ci.lo > 0.40) {
    verdict = 'KILL'
    summary = `BUY 24h win=${(winRate * 100).toFixed(1)}% n=${n}, 95% CI lower=${(ci.lo * 100).toFixed(1)}% > 40%`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `BUY 24h win=${(winRate * 100).toFixed(1)}% n=${n}, CI=[${(ci.lo * 100).toFixed(1)}%,${(ci.hi * 100).toFixed(1)}%]`
  }

  const payload = {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    eval_window: '24h',
    signal_types: ['BUY', 'STRONG BUY'],
    n,
    wins: k,
    win_rate: winRate,
    ci_95: { lower: ci.lo, upper: ci.hi },
    verdict,
    summary,
  }
  const path = writeResult('H9_buy_24h_ci', payload)
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H9_buy_24h_ci.json' })
  console.log(`[H9] ${verdict} — ${summary}`)
  console.log(`[H9] wrote ${path}`)
}

main().catch(err => { console.error(err); process.exit(1) })
