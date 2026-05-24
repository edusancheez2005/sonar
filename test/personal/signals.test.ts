import { describe, expect, it } from 'vitest'
import {
  filterPersonalSignals,
  MAX_PERSONAL_SIGNALS,
  type RawSignal,
} from '../../lib/personal/signals'

function mk(overrides: Partial<RawSignal> = {}): RawSignal {
  return {
    id: 1,
    token: 'SOL',
    signal: 'BUY',
    score: 75,
    confidence: 70,
    timeframe: '3d',
    price_at_signal: 100,
    computed_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('filterPersonalSignals', () => {
  describe('risk_tolerance bands', () => {
    it('conservative shows only STRONG with confidence >= 80', () => {
      const items = [
        mk({ id: 1, signal: 'STRONG BUY', confidence: 85 }),
        mk({ id: 2, signal: 'BUY', confidence: 95 }),
        mk({ id: 3, signal: 'STRONG SELL', confidence: 79 }),
        mk({ id: 4, signal: 'STRONG SELL', confidence: 80 }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: null,
      })
      expect(out.map((x) => x.id).sort()).toEqual([1, 4])
    })

    it('balanced allows BUY/SELL above 60% confidence', () => {
      const items = [
        mk({ id: 1, signal: 'BUY', confidence: 59 }),
        mk({ id: 2, signal: 'BUY', confidence: 60 }),
        mk({ id: 3, signal: 'NEUTRAL', confidence: 99 }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'balanced',
        time_horizon: null,
      })
      expect(out.map((x) => x.id)).toEqual([2])
    })

    it('aggressive lets through 40%+ confidence non-neutral', () => {
      const items = [
        mk({ id: 1, signal: 'SELL', confidence: 39 }),
        mk({ id: 2, signal: 'SELL', confidence: 40 }),
        mk({ id: 3, signal: 'NEUTRAL', confidence: 100 }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'aggressive',
        time_horizon: null,
      })
      expect(out.map((x) => x.id)).toEqual([2])
    })

    it('null risk_tolerance falls back to conservative', () => {
      const items = [mk({ signal: 'BUY', confidence: 99 })]
      const out = filterPersonalSignals(items, {
        risk_tolerance: null,
        time_horizon: null,
      })
      expect(out).toHaveLength(0)
    })
  })

  describe('time_horizon preference', () => {
    it('intraday keeps only 24h and 3d timeframes', () => {
      const items = [
        mk({ id: 1, timeframe: '24h', confidence: 85, signal: 'STRONG BUY' }),
        mk({ id: 2, timeframe: '3d', confidence: 85, signal: 'STRONG BUY' }),
        mk({ id: 3, timeframe: '7d', confidence: 85, signal: 'STRONG BUY' }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: 'intraday',
      })
      expect(out.map((x) => x.id).sort()).toEqual([1, 2])
    })

    it('long_term keeps only 7d', () => {
      const items = [
        mk({ id: 1, timeframe: '24h', confidence: 85, signal: 'STRONG BUY' }),
        mk({ id: 2, timeframe: '7d', confidence: 85, signal: 'STRONG BUY' }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: 'long_term',
      })
      expect(out.map((x) => x.id)).toEqual([2])
    })

    it('null time_horizon does not filter by timeframe', () => {
      const items = [
        mk({ id: 1, timeframe: '24h', confidence: 85, signal: 'STRONG BUY' }),
        mk({ id: 2, timeframe: null, confidence: 85, signal: 'STRONG BUY' }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: null,
      })
      expect(out).toHaveLength(2)
    })
  })

  describe('ranking and cap', () => {
    it('orders by confidence DESC then |score-50| DESC', () => {
      const items = [
        mk({ id: 1, signal: 'STRONG BUY', confidence: 85, score: 60 }),
        mk({ id: 2, signal: 'STRONG BUY', confidence: 85, score: 90 }),
        mk({ id: 3, signal: 'STRONG BUY', confidence: 95, score: 55 }),
      ]
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: null,
      })
      expect(out.map((x) => x.id)).toEqual([3, 2, 1])
    })

    it('caps at MAX_PERSONAL_SIGNALS', () => {
      const items: RawSignal[] = Array.from({ length: 30 }, (_, i) =>
        mk({ id: i, signal: 'STRONG BUY', confidence: 90 + (i % 5) }),
      )
      const out = filterPersonalSignals(items, {
        risk_tolerance: 'conservative',
        time_horizon: null,
      })
      expect(out).toHaveLength(MAX_PERSONAL_SIGNALS)
    })
  })

  describe('match_reason annotation', () => {
    it('mentions risk profile and horizon', () => {
      const out = filterPersonalSignals(
        [mk({ signal: 'STRONG BUY', confidence: 90, timeframe: '7d' })],
        { risk_tolerance: 'conservative', time_horizon: 'long_term' },
      )
      expect(out[0].match_reason).toMatch(/STRONG BUY/)
      expect(out[0].match_reason).toMatch(/90%/)
      expect(out[0].match_reason).toMatch(/conservative/)
      expect(out[0].match_reason).toMatch(/long-term/)
    })
  })

  it('handles empty input', () => {
    expect(
      filterPersonalSignals([], {
        risk_tolerance: 'aggressive',
        time_horizon: 'swing',
      }),
    ).toEqual([])
  })
})
