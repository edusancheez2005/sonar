#!/usr/bin/env node
/**
 * H7 — Empirical bands lift STRONG-band performance
 *
 * Hypothesis: replacing the hard-coded score thresholds {72,58,43,28,−∞}
 * with empirical percentile cuts (e.g. top/bottom 10% of observed score
 * distribution) materially lifts STRONG-band alpha — pairs with H8.
 *
 * Method:
 *   1. Compute the 10th and 90th percentile of observed token_signals.score
 *      in the forensic window.
 *   2. Re-label every signal_outcomes row under the new bands.
 *   3. Compute AVG(alpha_24h) per new STRONG_SELL_new band and compare to
 *      the current STRONG_SELL mean.
 *
 * PASS: STRONG_SELL_new AVG(alpha) ≥ 300 bps better AND n_new ≥ 100
 * KILL: no improvement (≤ 0 bps lift) at any quantile in {5%,10%,20%}
 * INCONCLUSIVE: otherwise.
 *
 * STATUS: STUB.
 * Read-only.
 */

console.error('[H7] STUB')
process.exit(2)
