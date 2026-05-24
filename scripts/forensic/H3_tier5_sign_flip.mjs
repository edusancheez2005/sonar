#!/usr/bin/env node
/**
 * H3 — Tier 5 (derivatives) sign-flip after 2026-04-01
 *
 * Hypothesis: ρ(tier5_score, alpha_24h) has the opposite sign before vs
 * after 2026-04-01, suggesting a derivatives-data ingestion or sign-convention
 * change broke the engine.
 *
 * DATA-GAP FINDING:
 *   token_signals does NOT persist tier5_score as a separate column.
 *   Available tier columns: tier1..tier4 _score / _confidence.
 *   Tier 5 (derivatives) IS computed in compute-signals/route.js but is
 *   folded into the composite `score` directly (weight 0.3) and only the
 *   per-name contribution survives in `top_factors` JSONB as
 *   {name:'Derivatives', score, weight, contribution}.
 *
 * To execute H3 properly, one of:
 *   (a) extend token_signals with tier5_score / tier5_confidence columns
 *       and backfill from top_factors,
 *   (b) parse top_factors JSON to extract Derivatives.score per row (works
 *       for forward data only — older rows may not have it).
 *
 * Verdict: INCONCLUSIVE (data-gap) — record and move on.
 *
 * Read-only.
 */

import { writeResult, appendFinding, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H3 — Tier 5 sign flip'
const verdict = 'INCONCLUSIVE'
const summary = 'tier5_score not persisted as a column on token_signals; would require schema change or top_factors JSON parsing pass to execute. Deferred — see H3 header docstring for remediation paths.'

writeResult('H3_tier5_sign_flip', {
  hypothesis: HYPOTHESIS,
  window_start: FORENSIC_WINDOW_START,
  verdict,
  summary,
  data_gap: true,
  remediation: [
    'Option A: ALTER TABLE token_signals ADD COLUMN tier5_score NUMERIC, tier5_confidence NUMERIC; backfill from top_factors.',
    'Option B: parse top_factors JSONB inline (works only for rows where Derivatives factor exists).',
  ],
})
appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H3_tier5_sign_flip.json' })
console.log(`[H3] ${verdict} — ${summary}`)
