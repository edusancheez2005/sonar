#!/usr/bin/env node
/**
 * H4 — Tier 4 contributes ~zero information
 *
 * Hypothesis: dropping tier 4 from the composite leaves Spearman ρ vs 24h
 * alpha essentially unchanged.
 *
 * Method:
 *   1. Pull signal_outcomes (24h, suspect=false, correct not null, since
 *      forensic window start) → signal_id, alpha_pct, price_change_pct.
 *   2. Join token_signals via signal_id → score, tier1..4_score.
 *   3. Baseline ρ  = Spearman(score, target).
 *   4. Drop-T4 ρ  = Spearman(T1+T2+T3, target).
 *      Spearman is rank-based ⇒ renormalisation of weights is irrelevant;
 *      sum-of-three is the unbiased drop test.
 *   5. Compare |Δρ|. Target = alpha_pct (falls back to price_change_pct).
 *
 * PASS  (T4 dead):    |Δρ| < 0.01    → drop T4 from compute-signals.
 * KILL  (T4 useful):  |Δρ| > 0.03    → keep T4.
 * INCONCLUSIVE: between, or n < 200.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, spearman, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H4 — Drop Tier 4'

async function main() {
  const client = makeClient()
  console.log('[H4] fetching 24h outcomes + tier scores')

  const outcomes = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_id, alpha_pct, price_change_pct')
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
      .select('id, score, tier1_score, tier2_score, tier3_score, tier4_score')
      .in('id', batch)
    if (error) throw error
    for (const r of (data || [])) sigById.set(r.id, r)
  }

  const baseline = [], drop = [], y = []
  for (const o of outcomes) {
    const s = sigById.get(o.signal_id)
    if (!s) continue
    const target = Number.isFinite(o.alpha_pct) ? o.alpha_pct : o.price_change_pct
    if (!Number.isFinite(target) || !Number.isFinite(s.score)) continue
    const t1 = Number(s.tier1_score) || 0
    const t2 = Number(s.tier2_score) || 0
    const t3 = Number(s.tier3_score) || 0
    baseline.push(s.score)
    drop.push(t1 + t2 + t3)
    y.push(target)
  }

  const n = y.length
  const rhoBase = spearman(baseline, y)
  const rhoDrop = spearman(drop, y)
  const dRho = (rhoBase != null && rhoDrop != null) ? Math.abs(rhoBase - rhoDrop) : null

  let verdict, summary
  if (n < 200 || dRho == null) {
    verdict = 'INCONCLUSIVE'
    summary = `n=${n} insufficient or correlation undefined`
  } else if (dRho < 0.01) {
    verdict = 'PASS'
    summary = `|Δρ|=${dRho.toFixed(4)} < 0.01 (ρ_base=${rhoBase.toFixed(4)} ρ_dropT4=${rhoDrop.toFixed(4)} n=${n}) — T4 is dead weight`
  } else if (dRho > 0.03) {
    verdict = 'KILL'
    summary = `|Δρ|=${dRho.toFixed(4)} > 0.03 (ρ_base=${rhoBase.toFixed(4)} ρ_dropT4=${rhoDrop.toFixed(4)} n=${n}) — T4 carries info`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `|Δρ|=${dRho.toFixed(4)} between 0.01 and 0.03 (n=${n})`
  }

  writeResult('H4_drop_tier4', {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    n,
    rho_baseline: rhoBase,
    rho_drop_tier4: rhoDrop,
    delta_rho_abs: dRho,
    verdict,
    summary,
  })
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H4_drop_tier4.json' })
  console.log(`[H4] ${verdict} — ${summary}`)
}

main().catch(err => { console.error(err); process.exit(1) })
