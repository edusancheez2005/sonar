#!/usr/bin/env node
/**
 * H5 — Tier 3 contributes ~zero information
 *
 * Hypothesis: dropping tier 3 from the composite leaves Spearman ρ vs 24h
 * alpha essentially unchanged. (Same shape as H4 but on T3.)
 *
 * Method: as H4. Baseline = Spearman(score, target). Drop = Spearman(T1+T2+T4,
 * target). Spearman is rank-based ⇒ weight renormalisation is irrelevant.
 *
 * Spec from PROMPT_SIGNAL_EXECUTION.md §3.2 phrases the threshold in basis
 * points of net return, not ρ — but Δ-ρ is the cleaner, rank-stable
 * statistic. We use Δ-ρ < 0.01 as the drop signal (matches H4 convention)
 * and surface the bp interpretation in the notes.
 *
 * PASS  (T3 dead):    |Δρ| < 0.01    → drop T3.
 * KILL  (T3 useful):  |Δρ| > 0.03    → keep T3.
 * INCONCLUSIVE: between, or n < 200.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, spearman, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H5 — Drop Tier 3'

async function main() {
  const client = makeClient()
  console.log('[H5] fetching 24h outcomes + tier scores')

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
    const t4 = Number(s.tier4_score) || 0
    baseline.push(s.score)
    drop.push(t1 + t2 + t4)
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
    summary = `|Δρ|=${dRho.toFixed(4)} < 0.01 (ρ_base=${rhoBase.toFixed(4)} ρ_dropT3=${rhoDrop.toFixed(4)} n=${n}) — T3 is dead weight`
  } else if (dRho > 0.03) {
    verdict = 'KILL'
    summary = `|Δρ|=${dRho.toFixed(4)} > 0.03 (ρ_base=${rhoBase.toFixed(4)} ρ_dropT3=${rhoDrop.toFixed(4)} n=${n}) — T3 carries info`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `|Δρ|=${dRho.toFixed(4)} between 0.01 and 0.03 (n=${n})`
  }

  writeResult('H5_drop_tier3', {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    n,
    rho_baseline: rhoBase,
    rho_drop_tier3: rhoDrop,
    delta_rho_abs: dRho,
    verdict,
    summary,
  })
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H5_drop_tier3.json' })
  console.log(`[H5] ${verdict} — ${summary}`)
}

main().catch(err => { console.error(err); process.exit(1) })
