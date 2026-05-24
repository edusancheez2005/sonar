#!/usr/bin/env node
/**
 * H2 — 3-tier sign-agreement filter removes worst signals
 *
 * Hypothesis: when T1, T2, T3 all agree on direction AND align with the
 * emitted signal_type, mean 24h alpha is materially better than when they
 * disagree.
 *
 * Method:
 *   1. Pull 24h outcomes (suspect=false) with signal_type + alpha.
 *   2. Join token_signals → tier1..3_score.
 *   3. For SELL/STRONG SELL: three_agree = (sign(t1)<0 && sign(t2)<0 && sign(t3)<0).
 *      For BUY/STRONG BUY:   three_agree = (sign(t1)>0 && sign(t2)>0 && sign(t3)>0).
 *      Direction-normalise alpha: SELL → -alpha (so higher = better SELL).
 *   4. Compare mean(alpha_norm | three_agree=1) − mean(alpha_norm | three_agree=0).
 *
 * PASS: lift ≥ 5.0pp AND both buckets n ≥ 50  → add gate to engine.
 * KILL: lift < 1.0pp                          → no gating benefit.
 * INCONCLUSIVE: between, or either n < 50.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, mean, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H2 — 3-tier sign-agreement gate'

async function main() {
  const client = makeClient()
  console.log('[H2] fetching 24h outcomes with signal_type + tier scores')

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
      .select('id, tier1_score, tier2_score, tier3_score')
      .in('id', batch)
    if (error) throw error
    for (const r of (data || [])) sigById.set(r.id, r)
  }

  // direction-normalised alpha per side
  const agree = [], disagree = []
  let nBuy = 0, nSell = 0
  for (const o of outcomes) {
    const s = sigById.get(o.signal_id)
    if (!s) continue
    const target = Number.isFinite(o.alpha_pct) ? o.alpha_pct : o.price_change_pct
    if (!Number.isFinite(target)) continue
    const t1 = Number(s.tier1_score), t2 = Number(s.tier2_score), t3 = Number(s.tier3_score)
    if (![t1, t2, t3].every(Number.isFinite)) continue

    const isSell = o.signal_type === 'SELL' || o.signal_type === 'STRONG SELL'
    const isBuy  = o.signal_type === 'BUY'  || o.signal_type === 'STRONG BUY'
    if (!isSell && !isBuy) continue

    let threeAgree
    let alphaNorm
    if (isSell) {
      threeAgree = t1 < 0 && t2 < 0 && t3 < 0
      alphaNorm = -target
      nSell++
    } else {
      threeAgree = t1 > 0 && t2 > 0 && t3 > 0
      alphaNorm = target
      nBuy++
    }
    ;(threeAgree ? agree : disagree).push(alphaNorm)
  }

  const meanAgree = agree.length ? mean(agree) : null
  const meanDis = disagree.length ? mean(disagree) : null
  const lift = (meanAgree != null && meanDis != null) ? (meanAgree - meanDis) : null

  let verdict, summary
  if (agree.length < 50 || disagree.length < 50) {
    verdict = 'INCONCLUSIVE'
    summary = `n_agree=${agree.length}, n_disagree=${disagree.length} (need ≥50 each)`
  } else if (lift >= 5.0) {
    verdict = 'PASS'
    summary = `3-tier-agree lifts mean α_norm by ${lift.toFixed(2)}pp (agree=${meanAgree.toFixed(2)}, disagree=${meanDis.toFixed(2)}, n_a=${agree.length}, n_d=${disagree.length})`
  } else if (lift < 1.0) {
    verdict = 'KILL'
    summary = `3-tier-agree lifts mean α_norm by only ${lift.toFixed(2)}pp (agree=${meanAgree.toFixed(2)}, disagree=${meanDis.toFixed(2)})`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `lift=${lift.toFixed(2)}pp between 1.0 and 5.0`
  }

  writeResult('H2_three_tier_gate', {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    n_buy: nBuy,
    n_sell: nSell,
    n_agree: agree.length,
    n_disagree: disagree.length,
    mean_alpha_norm_agree: meanAgree,
    mean_alpha_norm_disagree: meanDis,
    lift_pp: lift,
    verdict,
    summary,
  })
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H2_three_tier_gate.json' })
  console.log(`[H2] ${verdict} — ${summary}`)
}

main().catch(err => { console.error(err); process.exit(1) })
