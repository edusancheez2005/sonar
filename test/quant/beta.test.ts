import { describe, it, expect } from 'vitest'
import {
  olsBeta,
  residualAlpha,
  beatFromResidual,
  winsorizeSeries,
  pairFiniteReturns,
  proportionTrue,
} from '@/lib/quant/beta'

describe('olsBeta', () => {
  it('recovers an exact slope with R²=1 when asset = 2·market', () => {
    const market = [-2, -1, 1, 2]
    const asset = [-4, -2, 2, 4]
    const res = olsBeta(asset, market, { minN: 4 })
    expect(res).not.toBeNull()
    expect(res!.beta).toBeCloseTo(2, 10)
    expect(res!.rSquared).toBeCloseTo(1, 10)
    expect(res!.n).toBe(4)
  })

  it('estimates a noisy slope and a fractional R²', () => {
    const market = [-2, -1, 1, 2]
    const asset = [-3, -2, 2, 3]
    const res = olsBeta(asset, market, { minN: 4 })
    expect(res!.beta).toBeCloseTo(1.6, 10) // sxy=16 / sxx=10
    expect(res!.rSquared).toBeCloseTo(256 / 260, 6)
  })

  it('returns null below the minimum sample size', () => {
    expect(olsBeta([1, 2, 3], [1, 2, 3], { minN: 30 })).toBeNull()
  })

  it('returns null on length mismatch', () => {
    expect(olsBeta([1, 2, 3, 4], [1, 2, 3], { minN: 2 })).toBeNull()
  })

  it('returns null when the market is (near-)constant — unstable slope', () => {
    const market = [1, 1, 1, 1, 1]
    const asset = [3, -2, 5, 0, 1]
    expect(olsBeta(asset, market, { minN: 4 })).toBeNull()
  })

  it('defaults minN to 30', () => {
    const x = Array.from({ length: 29 }, (_, i) => i - 14)
    expect(olsBeta(x, x)).toBeNull()
    const x30 = Array.from({ length: 30 }, (_, i) => i - 15)
    const res = olsBeta(x30, x30)
    expect(res!.beta).toBeCloseTo(1, 10)
  })
})

describe('residualAlpha', () => {
  it('subtracts the beta-scaled market move', () => {
    // token +5%, BTC +4%, beta 1.5 → residual = 5 − 6 = −1
    expect(residualAlpha(5, 4, 1.5)).toBeCloseTo(-1, 10)
  })

  it('equals raw alpha when beta is exactly 1 (the old flawed label)', () => {
    expect(residualAlpha(5, 4, 1)).toBeCloseTo(1, 10)
  })

  it('a high-beta down-market move yields NEGATIVE residual despite "beating" BTC', () => {
    // The core audit insight: token −6%, BTC −4%, beta 1.5 → expected −6, so
    // residual = −6 − (1.5·−4) = 0. A SELL here did NOT generate skill alpha.
    expect(residualAlpha(-6, -4, 1.5)).toBeCloseTo(0, 10)
    // Raw alpha (beta=1) would have mislabeled this a +2pp "win" for a SELL.
    expect(residualAlpha(-6, -4, 1)).toBeCloseTo(-2, 10)
  })
})

describe('beatFromResidual', () => {
  it('grades bullish on residual > 0', () => {
    expect(beatFromResidual(0.5, 'bullish')).toBe(true)
    expect(beatFromResidual(-0.5, 'bullish')).toBe(false)
  })
  it('grades bearish on residual < 0', () => {
    expect(beatFromResidual(-0.5, 'bearish')).toBe(true)
    expect(beatFromResidual(0.5, 'bearish')).toBe(false)
  })
  it('treats exact zero as not-beaten in either direction', () => {
    expect(beatFromResidual(0, 'bullish')).toBe(false)
    expect(beatFromResidual(0, 'bearish')).toBe(false)
  })
})

describe('winsorizeSeries', () => {
  it('clips both tails to the empirical quantiles', () => {
    const values = [100, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const out = winsorizeSeries(values, 0.1)
    // sorted tails at idx 1 (=2) and idx 8 (=9): 100→9, 1→2, rest unchanged.
    expect(out).toEqual([9, 2, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('preserves positions (returns a clipped copy, not a sort)', () => {
    const values = [5, -100, 5, 5, 5, 5, 5, 5, 5, 100]
    const out = winsorizeSeries(values, 0.1)
    expect(out.length).toBe(values.length)
    expect(out[0]).toBe(5)
  })

  it('passes through unchanged for tiny samples (n<5)', () => {
    expect(winsorizeSeries([1, 2, 100], 0.1)).toEqual([1, 2, 100])
  })

  it('passes through when pct=0 and never mutates the input', () => {
    const values = [3, 1, 2]
    const out = winsorizeSeries(values, 0)
    expect(out).toEqual([3, 1, 2])
    expect(values).toEqual([3, 1, 2])
  })

  it('neutralizes a single fake spike before it can poison a mean', () => {
    // 20 clean returns in [−2, 2] summing to 0, plus one MATIC→POL-style
    // +326% data-error spike. At 5%/tail on n=21 the top index excludes the
    // spike, so it clips down to the clean max.
    const clean = Array.from({ length: 20 }, (_, i) => [1, -1, 2, -2][i % 4])
    const poisoned = [...clean, 326]
    const meanPoisoned = poisoned.reduce((a, b) => a + b, 0) / poisoned.length
    const w = winsorizeSeries(poisoned, 0.05)
    const meanW = w.reduce((a, b) => a + b, 0) / w.length
    expect(meanPoisoned).toBeGreaterThan(14)
    expect(meanW).toBeLessThan(1)
    expect(Math.max(...w)).toBe(2)
  })
})

describe('pairFiniteReturns', () => {
  it('drops pairs where either side is null/NaN and keeps alignment', () => {
    const asset = [1, null, 3, NaN, 5]
    const market = [2, 2, null, 4, 5]
    const { asset: a, market: m } = pairFiniteReturns(asset, market)
    expect(a).toEqual([1, 5])
    expect(m).toEqual([2, 5])
  })

  it('handles differing lengths by truncating to the shorter', () => {
    const { asset, market } = pairFiniteReturns([1, 2, 3], [1, 2])
    expect(asset).toEqual([1, 2])
    expect(market).toEqual([1, 2])
  })
})

describe('proportionTrue', () => {
  it('ignores null/undefined and reports pct + resolved n', () => {
    const { pct, n } = proportionTrue([true, false, null, true, undefined, false])
    expect(n).toBe(4)
    expect(pct).toBeCloseTo(50, 10)
  })

  it('returns 0/0 for an all-null column', () => {
    expect(proportionTrue([null, undefined])).toEqual({ pct: 0, n: 0 })
  })
})
