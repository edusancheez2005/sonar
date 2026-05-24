#!/usr/bin/env node
/**
 * H4 — Tier 4 contributes ~zero information
 *
 * Hypothesis: dropping tier 4 from the composite leaves predictive power
 * (Spearman ρ vs net_24h alpha) essentially unchanged.
 *
 * Method:
 *   1. Pull token_signals.tier1..4_score + signal_outcomes.alpha_pct
 *      (eval_window='24h', suspect=false, correct not null) joined on
 *      signal_id.
 *   2. Compute Spearman ρ between (score_with_T4) and alpha_24h.
 *   3. Compute Spearman ρ between (score_minus_T4 = recomputed composite
 *      with T4 weight set to 0 and others renormalised) and alpha_24h.
 *   4. Report |Δρ|.
 *
 * PASS  (T4 is dead weight): |Δρ| < 0.01    → drop T4 from compute-signals.
 * KILL  (T4 matters):         |Δρ| > 0.03   → keep T4, focus elsewhere.
 * INCONCLUSIVE: between 0.01 and 0.03, or n < 200.
 *
 * STATUS: STUB. Wire up the Spearman computation (borrow from scripts/ic_audit.js
 * `rank()` helper) and the weight-renormalisation logic. The composite formula
 * lives in app/lib/signalEngine.ts — re-implement only the weighted sum step
 * for the recomputation (do NOT import the engine; we want a counterfactual,
 * not a re-run).
 *
 * Read-only.
 */

console.error('[H4] STUB — implement per the header docstring')
console.error('[H4] see scripts/ic_audit.js for ranks() + Spearman helpers')
process.exit(2)
