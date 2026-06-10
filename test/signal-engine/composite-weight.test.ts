import { describe, it, expect, afterEach } from 'vitest'
import { computeUnifiedSignal } from '@/app/lib/signalEngine'

/**
 * Coverage for audit finding #4: the derivatives sleeve was being added at a
 * hardcoded 0.30 on top of tier weights that already sum to 0.75 in IC_FIX
 * mode, inflating the composite to a 1.05 total. The golden fixture does not
 * exercise the `derivativesData.available` path, so this is the dedicated
 * regression net for the weight-normalisation fix.
 *
 * The `Derivatives` factor's `weight`/`contribution` are computed directly
 * from `derivWeight` (independent of the clamped composite), so they are a
 * crisp deterministic probe of the active weight without modelling the whole
 * engine.
 */

const NOW = Date.parse('2026-06-09T00:00:00Z')
const DERIV_COMPOSITE = 60

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    tokenSymbol: 'TEST',
    nowMs: NOW,
    transactions: [
      { classification: 'BUY', usd_value: 250000, timestamp: new Date(NOW - 60 * 60 * 1000).toISOString(), whale_address: '0xabc', confidence: 0.9, reasoning: 'DEX buy', to_label: 'uniswap' },
      { classification: 'BUY', usd_value: 300000, timestamp: new Date(NOW - 30 * 60 * 1000).toISOString(), whale_address: '0xdef', confidence: 0.85, reasoning: 'DEX buy', to_label: 'uniswap' },
    ],
    priceChanges: { change_1h: 1.2, change_24h: 3.0, change_7d: 5.0 },
    volumeData: { volume_24h: 1_000_000, avg_volume_7d: 800_000, market_cap: 50_000_000 },
    sentimentData: { score: 0.6, count: 5 },
    communityVotes: { bullish: 6, bearish: 1, neutral: 1 },
    derivativesData: {
      fundingRate: 0, fundingSignal: 0, longShortRatio: 1, longShortSignal: 0,
      topTraderSignal: 0, compositeSignal: DERIV_COMPOSITE, openInterestUsd: 0, available: true,
    },
    ...overrides,
  }
}

describe('composite derivatives weight normalisation (audit #4)', () => {
  afterEach(() => {
    delete process.env.COMPOSITE_WEIGHT_FIX
    delete process.env.SIGNAL_ENGINE_IC_FIX
  })

  it('weights derivatives at 0.25 in IC_FIX mode (default), not 0.30', () => {
    const out = computeUnifiedSignal(baseInput())
    const deriv = out.factors.find(f => f.name === 'Derivatives')
    expect(deriv).toBeDefined()
    expect(deriv!.weight).toBe(25)
    expect(deriv!.contribution).toBe(Math.round(DERIV_COMPOSITE * 0.25))
  })

  it('restores 0.30 when COMPOSITE_WEIGHT_FIX=off (kill-switch reverts cleanly)', () => {
    process.env.COMPOSITE_WEIGHT_FIX = 'off'
    const out = computeUnifiedSignal(baseInput())
    const deriv = out.factors.find(f => f.name === 'Derivatives')
    expect(deriv!.weight).toBe(30)
    expect(deriv!.contribution).toBe(Math.round(DERIV_COMPOSITE * 0.30))
  })

  it('total composite weight sums to 100 with all tiers + derivatives present', () => {
    const out = computeUnifiedSignal(baseInput())
    // 4 tiers (0.30+0.30+0.10+0.05 = 0.75) + derivatives (0.25) = 1.0 → 100.
    const totalWeight = out.factors.reduce((s, f) => s + f.weight, 0)
    expect(totalWeight).toBe(100)
  })

  it('pre-fix scaling summed to 105 (documents the bug the fix closes)', () => {
    process.env.COMPOSITE_WEIGHT_FIX = 'off'
    const out = computeUnifiedSignal(baseInput())
    const totalWeight = out.factors.reduce((s, f) => s + f.weight, 0)
    expect(totalWeight).toBe(105)
  })
})
