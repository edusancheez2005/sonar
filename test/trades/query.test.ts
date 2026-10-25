import { describe, it, expect } from 'vitest'
import {
  clampSinceHours, parseTradesParams, parseAfter, sinceBoundIso, listBoundIso, applyTradesFilters,
  SINCE_DEFAULT_LOOKBACK_MS, TRADES_STABLECOINS,
} from '@/lib/trades/query'

const NOW = Date.parse('2026-10-25T12:00:00Z')

function recorder() {
  const calls: any[] = []
  const q: any = new Proxy({}, {
    get: (_t, op: string) => (...args: any[]) => { calls.push([op, ...args]); return q },
  })
  return { q, calls }
}

describe('trades query', () => {
  it('clamps sinceHours to [1, 720]; 0 and junk mean 24', () => {
    expect(clampSinceHours('0')).toBe(24)
    expect(clampSinceHours('abc')).toBe(24)
    expect(clampSinceHours('0.5')).toBe(1)
    expect(clampSinceHours('99999')).toBe(720)
    expect(clampSinceHours('48')).toBe(48)
  })

  it('caps the page size at 100', () => {
    expect(parseTradesParams(new URLSearchParams('limit=200')).limit).toBe(100)
    expect(parseTradesParams(new URLSearchParams('limit=0')).limit).toBe(1)
    expect(parseTradesParams(new URLSearchParams('')).limit).toBe(100)
  })

  it('reads after as ISO, defaults to 10 minutes back, rejects junk', () => {
    expect(parseAfter(null, NOW)).toBe(new Date(NOW - SINCE_DEFAULT_LOOKBACK_MS).toISOString())
    expect(parseAfter('2026-10-25T11:59:50Z', NOW)).toBe('2026-10-25T11:59:50.000Z')
    expect(parseAfter('yesterday-ish', NOW)).toBeNull()
  })

  it('never lets a since read look back more than 24 h', () => {
    expect(sinceBoundIso('2026-10-01T00:00:00Z', 720, NOW)).toBe('2026-10-24T12:00:00.000Z')
    expect(sinceBoundIso('2026-10-25T11:59:50Z', 24, NOW)).toBe('2026-10-25T11:59:50.000Z')
    expect(sinceBoundIso('2026-10-25T09:00:00Z', 1, NOW)).toBe('2026-10-25T11:00:00.000Z')
    expect(listBoundIso(48, NOW)).toBe('2026-10-23T12:00:00.000Z')
  })

  it('applies the same row filters for both routes', () => {
    const { q, calls } = recorder()
    applyTradesFilters(q, parseTradesParams(new URLSearchParams('minUsd=50000&maxUsd=1e6&token=eth&side=BUY&chain=ethereum')))
    expect(calls).toEqual([
      ['not', 'token_symbol', 'is', null],
      ['not', 'token_symbol', 'ilike', 'unknown%'],
      ['not', 'token_symbol', 'in', `(${TRADES_STABLECOINS.join(',')})`],
      ['gte', 'usd_value', 50000],
      ['lte', 'usd_value', 1000000],
      ['ilike', 'token_symbol', '%eth%'],
      ['ilike', 'classification', 'buy'],
      ['ilike', 'blockchain', '%ethereum%'],
    ])
  })
})
