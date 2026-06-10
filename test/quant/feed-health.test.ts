import { describe, it, expect } from 'vitest'
import { findFrozenTickers } from '@/lib/quant/feed-health'

describe('findFrozenTickers', () => {
  it('flags a ticker frozen across the full run that the incoming price continues', () => {
    // LRC: 6 identical prints + incoming also identical → frozen.
    const incoming = { LRC: 0.01879, BTC: 62200 }
    const recent = {
      LRC: [0.01879, 0.01879, 0.01879, 0.01879, 0.01879, 0.01879, 0.01879],
      BTC: [62210, 62180, 62240, 62150, 62300, 62120, 62205],
    }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual(['LRC'])
  })

  it('does NOT flag when the incoming price breaks the frozen run (feed recovered)', () => {
    const incoming = { LRC: 0.01902 } // moved this tick
    const recent = { LRC: [0.01879, 0.01879, 0.01879, 0.01879, 0.01879, 0.01879] }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual([])
  })

  it('does NOT flag a healthy mover', () => {
    const incoming = { FET: 0.1991 }
    const recent = { FET: [0.2005, 0.1998, 0.2012, 0.1989, 0.2001, 0.1995] }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual([])
  })

  it('requires the full run to be identical (a single break disqualifies)', () => {
    const incoming = { LRC: 0.01879 }
    // newest 6 are NOT all equal (one different value in the run)
    const recent = { LRC: [0.01879, 0.01879, 0.01880, 0.01879, 0.01879, 0.01879] }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual([])
  })

  it('does not flag when history is shorter than minRun (insufficient evidence)', () => {
    const incoming = { NEW: 1.23 }
    const recent = { NEW: [1.23, 1.23, 1.23] } // only 3 < 6
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual([])
  })

  it('honours the stablecoin exemption', () => {
    const incoming = { USDT: 1.0, MKR: 1813.7 }
    const recent = {
      USDT: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      MKR: [1813.7, 1813.7, 1813.7, 1813.7, 1813.7, 1813.7],
    }
    const out = findFrozenTickers(incoming, recent, { minRun: 6, exemptTickers: new Set(['USDT']) })
    expect(out).toEqual(['MKR'])
  })

  it('skips non-finite incoming prices', () => {
    const incoming = { X: NaN }
    const recent = { X: [1, 1, 1, 1, 1, 1] }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual([])
  })

  it('returns a sorted list across multiple frozen tickers', () => {
    const incoming = { MKR: 1813.7, LRC: 0.01879 }
    const recent = {
      MKR: Array(6).fill(1813.7),
      LRC: Array(6).fill(0.01879),
    }
    expect(findFrozenTickers(incoming, recent, { minRun: 6 })).toEqual(['LRC', 'MKR'])
  })

  it('defaults minRun to 6', () => {
    const incoming = { LRC: 5 }
    expect(findFrozenTickers(incoming, { LRC: Array(5).fill(5) })).toEqual([]) // 5 < 6
    expect(findFrozenTickers(incoming, { LRC: Array(6).fill(5) })).toEqual(['LRC'])
  })
})
