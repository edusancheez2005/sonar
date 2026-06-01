import { describe, it, expect } from 'vitest'
import { extractTickerContext } from '@/components/orca/inline/parsers/extractTickerContext'

describe('extractTickerContext', () => {
  it('finds $BTC', () => {
    expect(extractTickerContext('Price of $BTC is up')).toBe('BTC')
  })
  it('finds bare BTC', () => {
    expect(extractTickerContext('BTC is consolidating')).toBe('BTC')
  })
  it('finds full name', () => {
    expect(extractTickerContext('solana whales accumulated')).toBe('SOL')
  })
  it('returns null on unknown', () => {
    expect(extractTickerContext('the weather is nice')).toBeNull()
  })
  it('picks dominant ticker', () => {
    const r = extractTickerContext('BTC and ETH; BTC moved; BTC dropped')
    expect(r).toBe('BTC')
  })
})
