import { describe, expect, it } from 'vitest'
import { summarise, meetsPromotionBar } from '../../lib/signal-research/metrics'

describe('summarise', () => {
  it('returns nulls on empty input', () => {
    const s = summarise([])
    expect(s.n_samples).toBe(0)
    expect(s.win_rate).toBeNull()
    expect(s.avg_pct).toBeNull()
    expect(s.sharpe_proxy).toBeNull()
    expect(s.max_drawdown_proxy).toBeNull()
  })

  it('computes win rate, average, and worst observation', () => {
    const s = summarise([
      { return_pct: 5 },
      { return_pct: 3 },
      { return_pct: -2 },
      { return_pct: 4 },
    ])
    expect(s.n_samples).toBe(4)
    expect(s.win_rate).toBeCloseTo(0.75)
    expect(s.avg_pct).toBeCloseTo(2.5)
    expect(s.max_drawdown_proxy).toBe(-2)
  })

  it('computes sharpe proxy as mean/stddev', () => {
    const s = summarise([
      { return_pct: 1 },
      { return_pct: 1 },
      { return_pct: 1 },
      { return_pct: -1 },
    ])
    expect(s.sharpe_proxy).toBeGreaterThan(0)
  })

  it('returns null sharpe when stddev is zero', () => {
    const s = summarise([
      { return_pct: 2 },
      { return_pct: 2 },
      { return_pct: 2 },
    ])
    expect(s.sharpe_proxy).toBeNull()
  })
})

describe('meetsPromotionBar', () => {
  const baseSummary = {
    n_samples: 300,
    win_rate: 0.65,
    avg_pct: 1.5,
    sharpe_proxy: 0.3,
    max_drawdown_proxy: -3.2,
  }

  it('passes when n>=200 and 24h win_rate>=0.60', () => {
    const r = meetsPromotionBar(baseSummary, '24h')
    expect(r.passes).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it('fails when n<200', () => {
    const r = meetsPromotionBar({ ...baseSummary, n_samples: 100 }, '24h')
    expect(r.passes).toBe(false)
    expect(r.reasons.some((x) => x.includes('n=100'))).toBe(true)
  })

  it('fails when 24h win_rate<0.60', () => {
    const r = meetsPromotionBar({ ...baseSummary, win_rate: 0.55 }, '24h')
    expect(r.passes).toBe(false)
  })

  it('does not apply the win-rate gate to non-24h windows', () => {
    const r = meetsPromotionBar({ ...baseSummary, win_rate: 0.5 }, '7d')
    expect(r.passes).toBe(true)
  })

  it('treats null win_rate as failing the 24h gate', () => {
    const r = meetsPromotionBar({ ...baseSummary, win_rate: null }, '24h')
    expect(r.passes).toBe(false)
  })
})
