import { describe, it, expect } from 'vitest'
import { parseThreshold } from '@/lib/orca/alerts/parseThreshold'
import { dedupHour } from '@/lib/orca/alerts/dedup'
import {
  normaliseTicker,
  normaliseAddress,
  isAlertKind,
  resolveThreshold,
} from '@/lib/orca/alerts/validate'

describe('parseThreshold', () => {
  it('parses percent forms', () => {
    expect(parseThreshold('5%')).toEqual({ threshold_pct: 5 })
    expect(parseThreshold('alert at 7.5 percent')).toEqual({ threshold_pct: 7.5 })
    expect(parseThreshold('10pct move')).toEqual({ threshold_pct: 10 })
  })
  it('parses USD forms', () => {
    expect(parseThreshold('$1M')).toEqual({ threshold_usd: 1_000_000 })
    expect(parseThreshold('1.5 million')).toEqual({ threshold_usd: 1_500_000 })
    expect(parseThreshold('750k')).toEqual({ threshold_usd: 750_000 })
    expect(parseThreshold('$2,000,000')).toEqual({ threshold_usd: 2_000_000 })
  })
  it('prefers percent when both present', () => {
    expect(parseThreshold('5% or $1M')).toEqual({ threshold_pct: 5 })
  })
  it('returns null for nonsense', () => {
    expect(parseThreshold('hello')).toBeNull()
    expect(parseThreshold('')).toBeNull()
    expect(parseThreshold(null as any)).toBeNull()
  })
})

describe('dedupHour', () => {
  it('floors to the start of the UTC hour', () => {
    expect(dedupHour(new Date('2026-06-03T14:37:22.500Z'))).toBe('2026-06-03T14:00:00.000Z')
  })
  it('is stable within an hour', () => {
    const a = dedupHour(new Date('2026-06-03T14:01:00Z'))
    const b = dedupHour(new Date('2026-06-03T14:59:00Z'))
    expect(a).toBe(b)
  })
})

describe('normaliseTicker', () => {
  it('uppercases and accepts valid tickers', () => {
    expect(normaliseTicker('sol')).toBe('SOL')
    expect(normaliseTicker(' wbtc ')).toBe('WBTC')
  })
  it('rejects invalid input', () => {
    expect(normaliseTicker('')).toBeNull()
    expect(normaliseTicker('TOOLONGTICKER!')).toBeNull()
    expect(normaliseTicker(123 as any)).toBeNull()
  })
})

describe('isAlertKind', () => {
  it('accepts the four kinds and rejects others', () => {
    expect(isAlertKind('price_move')).toBe(true)
    expect(isAlertKind('whale_flow')).toBe(true)
    expect(isAlertKind('signal_flip')).toBe(true)
    expect(isAlertKind('news_high_impact')).toBe(true)
    expect(isAlertKind('nope')).toBe(false)
    expect(isAlertKind(undefined)).toBe(false)
  })
  it('accepts the new wallet / news / social kinds', () => {
    expect(isAlertKind('wallet_activity')).toBe(true)
    expect(isAlertKind('news_any')).toBe(true)
    expect(isAlertKind('social_post')).toBe(true)
  })
})

describe('normaliseAddress', () => {
  it('lower-cases EVM addresses', () => {
    expect(normaliseAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12')).toBe(
      '0xabcdef1234567890abcdef1234567890abcdef12'
    )
  })
  it('keeps base58 (Solana) addresses as-is', () => {
    const sol = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    expect(normaliseAddress(sol)).toBe(sol)
  })
  it('rejects implausible input', () => {
    expect(normaliseAddress('')).toBeNull()
    expect(normaliseAddress('0x123')).toBeNull()
    expect(normaliseAddress('not an address!!')).toBeNull()
    expect(normaliseAddress(42 as any)).toBeNull()
  })
})

describe('resolveThreshold', () => {
  it('requires a positive pct for price_move', () => {
    expect(resolveThreshold('price_move', { threshold_pct: 5 })).toEqual({ threshold_pct: 5, threshold_usd: null })
    expect(resolveThreshold('price_move', { threshold_pct: 0 })).toBeNull()
    expect(resolveThreshold('price_move', {})).toBeNull()
  })
  it('requires a positive usd for whale_flow', () => {
    expect(resolveThreshold('whale_flow', { threshold_usd: 1_000_000 })).toEqual({ threshold_pct: null, threshold_usd: 1_000_000 })
    expect(resolveThreshold('whale_flow', { threshold_usd: -5 })).toBeNull()
  })
  it('returns empty thresholds for signal_flip / news_high_impact', () => {
    expect(resolveThreshold('signal_flip', {})).toEqual({ threshold_pct: null, threshold_usd: null })
    expect(resolveThreshold('news_high_impact', {})).toEqual({ threshold_pct: null, threshold_usd: null })
  })
  it('treats wallet_activity usd as an optional minimum', () => {
    expect(resolveThreshold('wallet_activity', {})).toEqual({ threshold_pct: null, threshold_usd: null })
    expect(resolveThreshold('wallet_activity', { threshold_usd: 0 })).toEqual({ threshold_pct: null, threshold_usd: null })
    expect(resolveThreshold('wallet_activity', { threshold_usd: 50_000 })).toEqual({ threshold_pct: null, threshold_usd: 50_000 })
    expect(resolveThreshold('wallet_activity', { threshold_usd: -1 })).toBeNull()
  })
  it('returns empty thresholds for news_any / social_post', () => {
    expect(resolveThreshold('news_any', {})).toEqual({ threshold_pct: null, threshold_usd: null })
    expect(resolveThreshold('social_post', {})).toEqual({ threshold_pct: null, threshold_usd: null })
  })
})
