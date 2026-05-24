/**
 * Signal-family predicates (§4.F of ORCA_COPILOT_BUILD_PROMPT.md).
 * =============================================================================
 * Pure, deterministic predicate functions for the three candidate signal
 * families we are evaluating in 2026Q3. Each family answers ONE question:
 *
 *   Given a snapshot of (whale flow, price action, sentiment, news) for a
 *   token, would this family have fired a signal at this point in time?
 *   If so, in which direction?
 *
 * "Pure" matters here — the backtest script feeds historical snapshots one
 * row at a time and counts forward returns. Side effects, randomness, or
 * future-looking lookups would invalidate the result.
 *
 * NONE of these families is wired to the production pipeline. They are
 * candidates. See docs/SIGNAL_RESEARCH_2026Q3.md for the predicate maths
 * and the go/no-go threshold (n >= 200 clean samples AND 24h win rate
 * >= 60% before any family is promoted).
 */

export type SignalDirection = 'long' | 'short' | null

export interface FamilyInput {
  // Whale flow inputs (over the trailing 24h)
  net_whale_flow_usd: number | null
  whale_inflow_usd: number | null
  whale_outflow_usd: number | null
  // Trailing 30d mean/stddev of |net flow|, populated by the backtest harness
  net_flow_abs_mean_30d: number | null
  net_flow_abs_std_30d: number | null
  // Price action
  price_change_pct_24h: number | null
  price_change_pct_7d: number | null
  // Sentiment composite, range conventionally [-1, +1]
  sentiment_composite: number | null
  // News cluster: count of articles in 24h sharing a factor tag with
  // aligned sentiment (positive or negative — the sign comes from
  // dominant_factor_sign).
  news_cluster_count_24h: number | null
  dominant_factor_sign: 1 | -1 | 0 | null
  // Quality flag from signal_outcomes — we ALWAYS skip suspect rows.
  suspect: boolean
}

export interface FamilyOutput {
  direction: SignalDirection
  // The numerical magnitude of the trigger (e.g. z-score, divergence
  // magnitude). 0 when direction is null. Higher = stronger conviction.
  magnitude: number
  // Free-form trace for the design doc reviewer.
  reason: string
}

/**
 * Family A — Whale-Flow Divergence
 * --------------------------------------------------------------------------
 * Sign convention reminder: `net_whale_flow_usd > 0` means net INFLOW to
 * exchanges (distribution / bearish). We therefore work in the "bullish
 * flow" domain: `bullish_flow = -net_whale_flow_usd` (outflow positive).
 *
 * If bullish-flow direction disagrees with the 24h price direction AND both
 * magnitudes are meaningful, we FADE the price move (mean-revert).
 *
 *   bullish_flow = -net_whale_flow_usd
 *   Trigger: sign(bullish_flow) != sign(price_change_24h)
 *            AND |net_flow| > MIN_DIVERGENCE_USD
 *            AND |price_change_24h| > MIN_PRICE_MOVE_PCT
 *   Direction: -sign(price_change_24h)  // fade
 */
export const FAMILY_A_MIN_DIVERGENCE_USD = 500_000
export const FAMILY_A_MIN_PRICE_MOVE_PCT = 2

export function familyA_whaleFlowDivergence(input: FamilyInput): FamilyOutput {
  if (input.suspect) return { direction: null, magnitude: 0, reason: 'suspect=true' }
  const flow = input.net_whale_flow_usd
  const price = input.price_change_pct_24h
  if (flow == null || price == null) {
    return { direction: null, magnitude: 0, reason: 'missing inputs' }
  }
  if (Math.abs(flow) < FAMILY_A_MIN_DIVERGENCE_USD) {
    return { direction: null, magnitude: 0, reason: 'flow below threshold' }
  }
  if (Math.abs(price) < FAMILY_A_MIN_PRICE_MOVE_PCT) {
    return { direction: null, magnitude: 0, reason: 'price move below threshold' }
  }
  const bullishFlow = -flow
  if (Math.sign(bullishFlow) === Math.sign(price)) {
    return { direction: null, magnitude: 0, reason: 'no divergence' }
  }
  const direction: SignalDirection = price < 0 ? 'long' : 'short'
  return {
    direction,
    magnitude: Math.abs(flow) / FAMILY_A_MIN_DIVERGENCE_USD,
    reason: `divergence flow=${flow.toFixed(0)} price=${price.toFixed(2)}%`,
  }
}

/**
 * Family B — Exchange-Netflow Imbalance (z-score)
 * --------------------------------------------------------------------------
 * If |net flow| is > Z standard deviations above its trailing 30d mean,
 * the OPPOSITE direction is the signal (heavy inflow to exchanges is
 * typically distribution; heavy outflow is typically accumulation).
 *
 *   Trigger: z = (|net_flow| - mean_30d) / std_30d > FAMILY_B_Z_THRESHOLD
 *   Direction: net_flow > 0 (inflow)  → 'short'  (sell pressure)
 *              net_flow < 0 (outflow) → 'long'   (accumulation)
 *
 * Sign convention assumed: net_whale_flow_usd > 0 means net inflow to
 * exchanges (i.e. coins moving onto exchanges, classic sell setup).
 * Verify this matches the existing schema before promoting.
 */
export const FAMILY_B_Z_THRESHOLD = 2

export function familyB_exchangeImbalance(input: FamilyInput): FamilyOutput {
  if (input.suspect) return { direction: null, magnitude: 0, reason: 'suspect=true' }
  const flow = input.net_whale_flow_usd
  const mean = input.net_flow_abs_mean_30d
  const std = input.net_flow_abs_std_30d
  if (flow == null || mean == null || std == null || std <= 0) {
    return { direction: null, magnitude: 0, reason: 'missing stats' }
  }
  const z = (Math.abs(flow) - mean) / std
  if (z < FAMILY_B_Z_THRESHOLD) {
    return { direction: null, magnitude: 0, reason: `z=${z.toFixed(2)} below threshold` }
  }
  if (flow === 0) {
    return { direction: null, magnitude: 0, reason: 'flow is zero' }
  }
  const direction: SignalDirection = flow > 0 ? 'short' : 'long'
  return { direction, magnitude: z, reason: `z=${z.toFixed(2)}` }
}

/**
 * Family C — Sentiment vs Price Mean-Reversion (compression)
 * --------------------------------------------------------------------------
 * If sentiment composite is strongly positive (> +0.5) while 7d price is
 * roughly flat (|7d| < 3%), the asset is in "upside compression" — sentiment
 * has run ahead of price. Mirror condition for downside.
 *
 *   Trigger A: sentiment > +0.5 AND |price_change_7d| < 3%  → 'long'
 *   Trigger B: sentiment < -0.5 AND |price_change_7d| < 3%  → 'short'
 *
 * Magnitude is |sentiment| (higher = stronger compression).
 */
export const FAMILY_C_SENTIMENT_THRESHOLD = 0.5
export const FAMILY_C_PRICE_FLAT_PCT = 3

export function familyC_sentimentCompression(input: FamilyInput): FamilyOutput {
  if (input.suspect) return { direction: null, magnitude: 0, reason: 'suspect=true' }
  const sent = input.sentiment_composite
  const price7d = input.price_change_pct_7d
  if (sent == null || price7d == null) {
    return { direction: null, magnitude: 0, reason: 'missing inputs' }
  }
  if (Math.abs(price7d) >= FAMILY_C_PRICE_FLAT_PCT) {
    return { direction: null, magnitude: 0, reason: 'price not flat' }
  }
  if (Math.abs(sent) < FAMILY_C_SENTIMENT_THRESHOLD) {
    return { direction: null, magnitude: 0, reason: 'sentiment not strong enough' }
  }
  const direction: SignalDirection = sent > 0 ? 'long' : 'short'
  return {
    direction,
    magnitude: Math.abs(sent),
    reason: `sentiment=${sent.toFixed(2)} flat7d=${price7d.toFixed(2)}%`,
  }
}

/**
 * Dispatcher used by the backtest script. Returns one row per family per
 * historical snapshot. The backtest then joins each fired signal to the
 * forward return at the requested window (24h / 3d / 7d) from
 * signal_outcomes / token_signals.
 */
export const SIGNAL_FAMILIES = {
  whale_flow_divergence: familyA_whaleFlowDivergence,
  exchange_imbalance: familyB_exchangeImbalance,
  sentiment_compression: familyC_sentimentCompression,
} as const

export type SignalFamilyName = keyof typeof SIGNAL_FAMILIES

export function evaluateAllFamilies(
  input: FamilyInput
): Record<SignalFamilyName, FamilyOutput> {
  return {
    whale_flow_divergence: familyA_whaleFlowDivergence(input),
    exchange_imbalance: familyB_exchangeImbalance(input),
    sentiment_compression: familyC_sentimentCompression(input),
  }
}
