import { describe, expect, it } from 'vitest'
import {
  familyA_whaleFlowDivergence,
  familyB_exchangeImbalance,
  familyC_sentimentCompression,
  familyD_fundingExtreme,
  familyE_newsEventDrift,
  familyF_btcRotation,
  evaluateAllFamilies,
  FAMILY_A_MIN_DIVERGENCE_USD,
  FAMILY_A_MIN_PRICE_MOVE_PCT,
  FAMILY_B_Z_THRESHOLD,
  FAMILY_C_SENTIMENT_THRESHOLD,
  FAMILY_C_PRICE_FLAT_PCT,
  FAMILY_D_THRESHOLD,
  FAMILY_E_MIN_CLUSTER,
  FAMILY_F_BTC_MOVE_PCT,
  FAMILY_F_REL_MOVE_PCT,
  type FamilyInput,
} from '../../lib/signal-research/families'

const base: FamilyInput = {
  net_whale_flow_usd: null,
  whale_inflow_usd: null,
  whale_outflow_usd: null,
  net_flow_abs_mean_30d: null,
  net_flow_abs_std_30d: null,
  price_change_pct_24h: null,
  price_change_pct_7d: null,
  sentiment_composite: null,
  news_cluster_count_24h: null,
  dominant_factor_sign: null,
  funding_rate: null,
  btc_change_pct_24h: null,
  suspect: false,
}

describe('familyA — whale-flow divergence', () => {
  it('fires LONG when whales accumulate against a price drop', () => {
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: -2_000_000, // outflow from exchanges = accumulation
      price_change_pct_24h: -5,
    })
    expect(out.direction).toBe('long')
    expect(out.magnitude).toBeGreaterThan(1)
  })

  it('fires SHORT when whales distribute into a price rally', () => {
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: 1_500_000,
      price_change_pct_24h: 4,
    })
    expect(out.direction).toBe('short')
  })

  it('does NOT fire when flow magnitude is below threshold', () => {
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: FAMILY_A_MIN_DIVERGENCE_USD - 1,
      price_change_pct_24h: -5,
    })
    expect(out.direction).toBeNull()
  })

  it('does NOT fire when price move is below threshold', () => {
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: 5_000_000,
      price_change_pct_24h: FAMILY_A_MIN_PRICE_MOVE_PCT - 0.1,
    })
    expect(out.direction).toBeNull()
  })

  it('does NOT fire on aligned signs (no divergence)', () => {
    // Distribution (inflow positive) + price drop = both bearish-aligned → no divergence.
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: 1_000_000,
      price_change_pct_24h: -3,
    })
    expect(out.direction).toBeNull()
  })

  it('skips suspect rows', () => {
    const out = familyA_whaleFlowDivergence({
      ...base,
      net_whale_flow_usd: -5_000_000,
      price_change_pct_24h: 5,
      suspect: true,
    })
    expect(out.direction).toBeNull()
    expect(out.reason).toMatch(/suspect/)
  })

  it('handles missing inputs gracefully', () => {
    const out = familyA_whaleFlowDivergence({ ...base })
    expect(out.direction).toBeNull()
  })
})

describe('familyB — exchange imbalance', () => {
  const stats = {
    net_flow_abs_mean_30d: 200_000,
    net_flow_abs_std_30d: 100_000,
  }
  it('fires SHORT on large inflow (z >= 2)', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      ...stats,
      net_whale_flow_usd: 600_000, // |600k - 200k| / 100k = 4 sigma
    })
    expect(out.direction).toBe('short')
    expect(out.magnitude).toBeGreaterThanOrEqual(FAMILY_B_Z_THRESHOLD)
  })

  it('fires LONG on large outflow', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      ...stats,
      net_whale_flow_usd: -500_000,
    })
    expect(out.direction).toBe('long')
  })

  it('does NOT fire below z threshold', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      ...stats,
      net_whale_flow_usd: 300_000, // z = 1
    })
    expect(out.direction).toBeNull()
  })

  it('handles missing stats safely', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      net_whale_flow_usd: 1_000_000,
    })
    expect(out.direction).toBeNull()
  })

  it('handles zero stddev safely', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      net_flow_abs_mean_30d: 100_000,
      net_flow_abs_std_30d: 0,
      net_whale_flow_usd: 500_000,
    })
    expect(out.direction).toBeNull()
  })

  it('skips suspect rows', () => {
    const out = familyB_exchangeImbalance({
      ...base,
      ...stats,
      net_whale_flow_usd: 1_000_000,
      suspect: true,
    })
    expect(out.direction).toBeNull()
  })
})

describe('familyC — sentiment compression', () => {
  it('fires LONG when sentiment is hot and price is flat', () => {
    const out = familyC_sentimentCompression({
      ...base,
      sentiment_composite: 0.7,
      price_change_pct_7d: 1,
    })
    expect(out.direction).toBe('long')
    expect(out.magnitude).toBeCloseTo(0.7)
  })

  it('fires SHORT when sentiment is cold and price is flat', () => {
    const out = familyC_sentimentCompression({
      ...base,
      sentiment_composite: -0.6,
      price_change_pct_7d: -0.5,
    })
    expect(out.direction).toBe('short')
  })

  it('does NOT fire when price has already moved', () => {
    const out = familyC_sentimentCompression({
      ...base,
      sentiment_composite: 0.8,
      price_change_pct_7d: FAMILY_C_PRICE_FLAT_PCT + 1,
    })
    expect(out.direction).toBeNull()
  })

  it('does NOT fire when sentiment is below threshold', () => {
    const out = familyC_sentimentCompression({
      ...base,
      sentiment_composite: FAMILY_C_SENTIMENT_THRESHOLD - 0.01,
      price_change_pct_7d: 0,
    })
    expect(out.direction).toBeNull()
  })

  it('skips suspect rows', () => {
    const out = familyC_sentimentCompression({
      ...base,
      sentiment_composite: 1,
      price_change_pct_7d: 0,
      suspect: true,
    })
    expect(out.direction).toBeNull()
  })
})

describe('evaluateAllFamilies', () => {
  it('returns one entry per family with stable keys', () => {
    const out = evaluateAllFamilies({ ...base, suspect: true })
    expect(Object.keys(out).sort()).toEqual(
      [
        'btc_rotation',
        'exchange_imbalance',
        'funding_extreme',
        'news_event_drift',
        'sentiment_compression',
        'whale_flow_divergence',
      ].sort()
    )
  })
})

describe('familyD — funding-rate extreme', () => {
  it('fires SHORT when funding is strongly positive (crowded longs)', () => {
    const out = familyD_fundingExtreme({ ...base, funding_rate: FAMILY_D_THRESHOLD * 2 })
    expect(out.direction).toBe('short')
    expect(out.magnitude).toBeCloseTo(2)
  })
  it('fires LONG when funding is strongly negative (crowded shorts)', () => {
    const out = familyD_fundingExtreme({ ...base, funding_rate: -FAMILY_D_THRESHOLD * 1.5 })
    expect(out.direction).toBe('long')
  })
  it('does NOT fire below threshold', () => {
    const out = familyD_fundingExtreme({ ...base, funding_rate: FAMILY_D_THRESHOLD * 0.5 })
    expect(out.direction).toBeNull()
  })
  it('skips when funding_rate missing', () => {
    expect(familyD_fundingExtreme({ ...base }).direction).toBeNull()
  })
})

describe('familyE — news-event drift', () => {
  it('fires LONG when bullish news cluster hits and price has not reacted', () => {
    const out = familyE_newsEventDrift({
      ...base,
      news_cluster_count_24h: FAMILY_E_MIN_CLUSTER,
      sentiment_composite: 0.5,
      price_change_pct_24h: 0.5,
      dominant_factor_sign: 1,
    })
    expect(out.direction).toBe('long')
  })
  it('fires SHORT when bearish news cluster hits and price has not reacted', () => {
    const out = familyE_newsEventDrift({
      ...base,
      news_cluster_count_24h: 5,
      sentiment_composite: -0.6,
      price_change_pct_24h: -1,
      dominant_factor_sign: -1,
    })
    expect(out.direction).toBe('short')
  })
  it('does NOT fire when price has already moved beyond reaction threshold', () => {
    const out = familyE_newsEventDrift({
      ...base,
      news_cluster_count_24h: 5,
      sentiment_composite: 0.6,
      price_change_pct_24h: 10,
      dominant_factor_sign: 1,
    })
    expect(out.direction).toBeNull()
  })
  it('is inert when news fields are null (forward-compat with current writer)', () => {
    expect(familyE_newsEventDrift({ ...base }).direction).toBeNull()
  })
})

describe('familyF — BTC rotation', () => {
  it('fires SHORT when BTC rallies but alt lags badly', () => {
    const out = familyF_btcRotation({
      ...base,
      btc_change_pct_24h: FAMILY_F_BTC_MOVE_PCT + 1,
      price_change_pct_24h: -3,
    })
    expect(out.direction).toBe('short')
  })
  it('fires LONG when BTC drops but alt holds up strongly', () => {
    const out = familyF_btcRotation({
      ...base,
      btc_change_pct_24h: -(FAMILY_F_BTC_MOVE_PCT + 1),
      price_change_pct_24h: 3,
    })
    expect(out.direction).toBe('long')
  })
  it('does NOT fire when BTC move is below threshold', () => {
    const out = familyF_btcRotation({
      ...base,
      btc_change_pct_24h: FAMILY_F_BTC_MOVE_PCT - 0.1,
      price_change_pct_24h: -20,
    })
    expect(out.direction).toBeNull()
  })
  it('does NOT fire when alt moves with BTC (no relative break)', () => {
    const out = familyF_btcRotation({
      ...base,
      btc_change_pct_24h: 5,
      price_change_pct_24h: 4,
    })
    expect(out.direction).toBeNull()
  })
})
