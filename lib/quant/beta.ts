/**
 * Pure market-neutral (alpha) math for the Sonar signal engine.
 *
 * The engine's historical "alpha" label was `price_change_pct − btc_change_pct`,
 * which silently assumes every token has market beta = 1.0 vs BTC. That makes
 * the label a beta proxy: high-beta alts "beat" BTC for free on the downside
 * in a selloff, low-beta tokens look skill-less. The 2026-06-09 audit traced
 * the engine's apparent edge almost entirely to this confound.
 *
 * This module provides the primitives to replace beta=1 with an estimated
 * per-(token, horizon) beta and to grade signals on the residual return
 *
 *     residual_alpha = asset_return − beta · market_return
 *
 * i.e. the part of the move NOT explained by the market. Everything here is
 * side-effect-free and deterministic: no I/O, no Date.now(), no module state.
 * Inputs are readonly arrays + scalars; degenerate inputs return null rather
 * than throwing, so callers at the DB boundary can pass raw columns.
 *
 * Style mirrors app/lib/calibration-math.ts (the existing pure-math home).
 *
 * Added 2026-06-09 (beta-adjusted alpha, audit item A).
 */

export type Direction = 'bullish' | 'bearish'

export interface BetaResult {
  /** OLS slope of asset return regressed on market return. */
  beta: number
  /** Number of paired observations the estimate was computed from. */
  n: number
  /**
   * Coefficient of determination (== squared Pearson correlation for a
   * simple regression). 0..1. A quality/telemetry field: low R² means the
   * token barely co-moves with BTC at this horizon, so the residual is
   * mostly idiosyncratic noise and beta is weakly identified.
   */
  rSquared: number
}

export interface OlsBetaOptions {
  /**
   * Minimum paired observations before a beta is returned. Below this the
   * estimate is too noisy to trust and the function returns null (caller
   * falls back to "no residual label"). Default 30.
   */
  minN?: number
  /**
   * Floor on market-return variance. If BTC barely moved across the sample
   * the slope is numerically unstable (dividing by ~0), so we refuse to
   * estimate. Units are (percent)², default 1e-6.
   */
  marketVarianceFloor?: number
}

const DEFAULT_MIN_N = 30
const DEFAULT_MARKET_VARIANCE_FLOOR = 1e-6

/**
 * Estimate market beta by OLS: regress `assetReturns` (y) on
 * `marketReturns` (x). beta = Cov(x, y) / Var(x).
 *
 * Returns null when:
 *   - the arrays differ in length,
 *   - fewer than `minN` paired observations remain, or
 *   - market-return variance is below `marketVarianceFloor` (unstable slope).
 *
 * Both arrays are expected to be pre-paired and finite. The function is
 * defensive about length only; callers should drop NaN/null pairs upstream
 * (see `pairFiniteReturns`).
 */
export function olsBeta(
  assetReturns: readonly number[],
  marketReturns: readonly number[],
  options: OlsBetaOptions = {},
): BetaResult | null {
  const minN = options.minN ?? DEFAULT_MIN_N
  const varianceFloor = options.marketVarianceFloor ?? DEFAULT_MARKET_VARIANCE_FLOOR

  const n = assetReturns.length
  if (n !== marketReturns.length) return null
  if (n < minN) return null

  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += marketReturns[i]
    sy += assetReturns[i]
  }
  const mx = sx / n
  const my = sy / n

  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = marketReturns[i] - mx
    const dy = assetReturns[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }

  // Var(x) = sxx / n. Guard against a degenerate (near-constant) market.
  if (!Number.isFinite(sxx) || sxx / n < varianceFloor) return null

  const beta = sxy / sxx
  if (!Number.isFinite(beta)) return null

  // R² = sxy² / (sxx · syy); 0 when the asset itself is constant.
  const denom = sxx * syy
  const rSquared = denom > 0 ? (sxy * sxy) / denom : 0

  return { beta, n, rSquared }
}

/**
 * Residual (market-neutral) return: the part of the asset move not explained
 * by the market at this token's beta.
 *
 *     residual = assetReturn − beta · marketReturn
 *
 * Pure arithmetic; no guards (callers pass finite numbers). Same units as the
 * inputs (percent in, percent out).
 */
export function residualAlpha(assetReturn: number, marketReturn: number, beta: number): number {
  return assetReturn - beta * marketReturn
}

/**
 * Did a directional signal earn POSITIVE residual alpha in its claimed
 * direction? bullish → residual > 0; bearish → residual < 0. Exact zero is
 * treated as "did not beat" (no free credit for a non-move).
 */
export function beatFromResidual(residual: number, direction: Direction): boolean {
  return direction === 'bullish' ? residual > 0 : residual < 0
}

/**
 * Symmetric winsorization of a return series to its [p, 1−p] empirical
 * quantiles. Used to make beta estimation robust to data-error spikes (e.g.
 * the MATIC→POL rename that produced a fake +326% "return" and poisoned every
 * pooled mean). Winsorizing — clipping, not dropping — preserves sample size
 * while bounding leverage of a single bad row.
 *
 * `pct` is the per-tail fraction (0.02 = clip the top and bottom 2%). Returns
 * a new array; the input is not mutated. For very small samples (where a tail
 * index would collapse) it returns a copy unchanged.
 */
export function winsorizeSeries(values: readonly number[], pct: number): number[] {
  const n = values.length
  if (n === 0) return []
  const p = Math.min(Math.max(pct, 0), 0.5)
  if (p === 0 || n < 5) return values.slice()

  const sorted = values.slice().sort((a, b) => a - b)
  const loIdx = Math.floor(p * n)
  const hiIdx = Math.min(n - 1, Math.ceil((1 - p) * n) - 1)
  const lo = sorted[loIdx]
  const hi = sorted[hiIdx]
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) return values.slice()

  return values.map(v => (v < lo ? lo : v > hi ? hi : v))
}

/**
 * Drop non-finite pairs from two parallel arrays, returning aligned clean
 * arrays. The DB boundary hands us NUMERIC columns that can be null; this is
 * the single place that filtering happens so the math functions above can
 * assume finite input.
 */
export function pairFiniteReturns(
  assetReturns: readonly (number | null | undefined)[],
  marketReturns: readonly (number | null | undefined)[],
): { asset: number[]; market: number[] } {
  const asset: number[] = []
  const market: number[] = []
  const n = Math.min(assetReturns.length, marketReturns.length)
  for (let i = 0; i < n; i++) {
    const rawA = assetReturns[i]
    const rawM = marketReturns[i]
    // Number(null) === 0 (finite!), so null/undefined must be rejected before
    // the coercion or they'd masquerade as a real 0% return.
    if (rawA === null || rawA === undefined || rawM === null || rawM === undefined) continue
    const a = Number(rawA)
    const m = Number(rawM)
    if (Number.isFinite(a) && Number.isFinite(m)) {
      asset.push(a)
      market.push(m)
    }
  }
  return { asset, market }
}

/**
 * Proportion of TRUE among a boolean flag column, ignoring null/undefined
 * (the "not graded" state). Returns pct in 0..100 and the resolved sample
 * size n. n=0 ⇒ pct=0. Powers alpha-beat-rate reads in the watchdog and
 * calibration without re-implementing the null-skipping each place.
 */
export function proportionTrue(
  flags: readonly (boolean | null | undefined)[],
): { pct: number; n: number } {
  let n = 0
  let t = 0
  for (const f of flags) {
    if (f === null || f === undefined) continue
    n++
    if (f === true) t++
  }
  return { pct: n > 0 ? (t / n) * 100 : 0, n }
}
