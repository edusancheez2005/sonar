import { describe, it, expect } from 'vitest'
import { extractTicker } from '@/lib/orca/ticker-extractor'

describe('extractTicker — short-key substring false positives', () => {
  it('does not match "op" inside "top whale moves this week"', () => {
    expect(extractTicker('What are the top whale moves this week?').ticker).toBeNull()
  })

  it('returns null for a generic social-momentum question', () => {
    expect(extractTicker('Which tokens are hot right now by social momentum?').ticker).toBeNull()
  })

  it('still resolves explicit coin names', () => {
    expect(extractTicker('bitcoin price').ticker).toBe('BTC')
    expect(extractTicker('optimism news').ticker).toBe('OP')
  })

  it('still resolves $TICKER and standalone tickers', () => {
    expect(extractTicker('$BTC analysis').ticker).toBe('BTC')
    expect(extractTicker('how is OP doing').ticker).toBe('OP')
  })
})
