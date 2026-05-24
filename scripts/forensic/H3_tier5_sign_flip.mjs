#!/usr/bin/env node
/**
 * H3 — Tier 5 (derivatives) flipped sign post-2026-04-01
 *
 * Hypothesis: the derivatives tier's IC sign changed between the pre and
 * post regime split, indicating the upstream funding/OI feed changed
 * sign convention or vendor.
 *
 * Method:
 *   1. Split signal_outcomes into pre (signal_time < 2026-04-01) and post
 *      (signal_time >= 2026-04-01) cohorts.
 *   2. Compute Spearman ρ(tier5_score → alpha_24h) within each cohort.
 *   3. Compare.
 *
 * NOTE: tier5 (derivatives) only present when derivatives data is available
 * (cron `cache-derivatives` writes the inputs). Many rows may have null t5.
 * Filter those out.
 *
 * PASS: |ρ_pre − ρ_post| > 0.2 AND signs differ → quarantine T5 or flip it.
 * KILL: |ρ_pre − ρ_post| < 0.05                 → no regime break in T5.
 * INCONCLUSIVE: in between, or n_per_cohort < 100.
 *
 * STATUS: STUB.
 * Read-only.
 */

console.error('[H3] STUB')
process.exit(2)
