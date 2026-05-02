/**
 * Shared quant constants (2026-05-01)
 *
 * Single source of truth for thresholds that previously drifted between
 * `app/api/cron/evaluate-signals/route.js`, `app/api/signals/accuracy/route.js`,
 * and `scripts/ic_audit.js`. Three copies of the same magic number is a
 * latent bug — one file changes, the other two silently disagree.
 *
 * The script-side (CommonJS) consumer mirrors the same values in
 * `scripts/lib/quant-constants.cjs`. Keep them in sync if you change one.
 */

/**
 * Noise floor for evaluating directional outcomes. Any |price change| below
 * this is statistically indistinguishable from data-feed jitter and is also
 * unprofitable after fees + slippage on a single round-trip. Outcomes whose
 * absolute return falls below this are recorded with `correct = null` so
 * they are excluded from accuracy aggregations downstream.
 *
 * 5 bps ≈ 0.05% ≈ Binance taker fee on a single side.
 */
export const NOISE_FLOOR_PCT = 0.05

/**
 * Minimum sample size before per-bucket accuracy is considered trustworthy.
 * Below this, `low_confidence: true` is set so the UI / audits can
 * de-emphasize vanity stats from tiny samples.
 */
export const MIN_N_FOR_TRUST = 30

/**
 * Minimum directional outcomes before we trust a per-token sign multiplier
 * derived from `signal_outcomes`. Below this, `sign_multiplier` is left
 * NULL so the engine falls back to its static defaults.
 */
export const MIN_N_FOR_SIGN = 20

/**
 * Round-trip transaction cost in basis points (taker fee + slippage,
 * both sides combined). Subtracted from gross PnL to produce net PnL in
 * the accuracy endpoint.
 */
export const ROUND_TRIP_BPS = 30
