/**
 * Pure calibration math used by /api/cron/calibrate-signals (Stage 3).
 * Kept side-effect-free + deterministic-given-rng so the regression test in
 * /scripts/test-signal-engine.mjs can exercise it without DB access.
 *
 * No `any` types, no I/O, no Date.now(). Inputs are arrays + scalars,
 * outputs are scalars. Optional `rng` parameter on bootstrap functions
 * defaults to Math.random; pass a seeded PRNG from tests to make CI
 * deterministic.
 *
 * Added 2026-05-04 (Stage 3 hardening).
 */

export type Rng = () => number

/**
 * Pearson correlation of paired (xs, ys). Returns null when fewer than 3
 * paired points OR when either sample has zero variance.
 */
export function pearsonIC(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length) return null
  const n = xs.length
  if (n < 3) return null
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i] }
  const mx = sx / n
  const my = sy / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  if (!isFinite(denom) || denom === 0) return null
  return num / denom
}

/**
 * Bootstrap percentile CI for the IC. Resamples (xs, ys) with replacement
 * `resamples` times, sorts the resulting ICs, and returns the
 * (alpha/2, 1-alpha/2) quantiles.
 *
 * Returns null when the input is too small or every resample degenerates
 * (zero variance). Callers should treat null as "no usable CI" and skip
 * the IC-magnitude gate.
 */
export function bootstrapICConfidenceInterval(
  xs: readonly number[],
  ys: readonly number[],
  resamples = 200,
  alpha = 0.05,
  rng: Rng = Math.random,
): { lower: number; upper: number } | null {
  const n = xs.length
  if (n !== ys.length || n < 10) return null
  const ics: number[] = []
  const bx = new Array<number>(n)
  const by = new Array<number>(n)
  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rng() * n)
      bx[i] = xs[j]
      by[i] = ys[j]
    }
    const ic = pearsonIC(bx, by)
    if (ic !== null && Number.isFinite(ic)) ics.push(ic)
  }
  if (ics.length < Math.max(20, Math.floor(resamples * 0.5))) return null
  ics.sort((a, b) => a - b)
  const lo = ics[Math.floor((alpha / 2) * ics.length)]
  const hi = ics[Math.min(ics.length - 1, Math.floor((1 - alpha / 2) * ics.length))]
  return { lower: lo, upper: hi }
}

/**
 * 0..100. Promotes BUY/SELL emission only when the engine's per-token
 * evidence is strong on BOTH directional accuracy AND magnitude
 * correlation. The hit-rate term dominates near-50% calls; the IC term
 * lifts confidence when score magnitude tracks return magnitude even at
 * coin-flip hit rates.
 *
 * Inputs:
 *   ic, hitRate: nullable point estimates (null when undefined upstream)
 *   n: number of directional outcomes the estimates were computed from
 *   icCILower / icCIUpper: bootstrap CI bounds; pass null to skip the
 *     "CI excludes zero" bonus
 *
 * Output is hard-clamped to 0 below MIN_N_FOR_CONFIDENCE so a thinly-evidenced
 * token cannot promote into the engine's label gate.
 */
export interface ConfidenceScoreInput {
  ic: number | null
  hitRate: number | null
  n: number
  icCILower: number | null
  icCIUpper: number | null
  minNForConfidence: number
}

export function deriveConfidenceScore(input: ConfidenceScoreInput): number {
  const { ic, hitRate, n, icCILower, icCIUpper, minNForConfidence } = input
  if (n <= 0 || n < minNForConfidence) return 0
  const fromHitRate = hitRate === null ? 0 : Math.abs(hitRate - 0.5) * 200
  const fromIc = ic === null ? 0 : Math.abs(ic) * 100
  // CI-excludes-zero kicker: the IC point estimate is much more trustworthy
  // when its 95% bootstrap CI doesn't straddle 0. Add a small bonus.
  const ciExcludesZero =
    icCILower !== null && icCIUpper !== null &&
    ((icCILower > 0 && icCIUpper > 0) || (icCILower < 0 && icCIUpper < 0))
  const ciBonus = ciExcludesZero ? 10 : 0
  return Math.min(100, Math.max(fromHitRate, fromIc) + ciBonus)
}
