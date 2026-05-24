#!/usr/bin/env node
/**
 * H5 — Tier 3 contributes ~zero information
 *
 * Hypothesis: dropping tier 3 from the composite changes 24h net return by
 * less than 10 bps.
 *
 * Method: same shape as H4 but on T3. Re-bucket signals into the new
 * STRONG/BUY/NEUTRAL/SELL/STRONG_SELL bands using the T3-zeroed composite,
 * then compute mean alpha per recomputed band and compare to current bands.
 *
 * PASS (T3 dead):   Δ net_return < 10 bps  → drop T3.
 * KILL (T3 useful): Δ net_return > 30 bps  → keep T3.
 * INCONCLUSIVE: 10–30 bps, or n < 200.
 *
 * STATUS: STUB.
 * Read-only.
 */

console.error('[H5] STUB — implement per the header docstring')
process.exit(2)
