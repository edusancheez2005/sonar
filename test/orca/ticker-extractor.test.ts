import { describe, it, expect } from 'vitest'
import { extractTicker, extractTickers } from '@/lib/orca/ticker-extractor'

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

describe('extractTickers — multi-ticker extraction for social_posts', () => {
  const has = (text: string) => extractTickers(text).sort()

  it('pulls every cashtag and coin name from a real tweet', () => {
    // The exact post that was stored with tickers_mentioned=null in prod.
    const tweet =
      '$PEPE if there is a stronger eth rotation and eth blitzes higher, I ' +
      'expect PEPE will do pretty well. This is the most liquid meme (other ' +
      'than DOGE) and you can size appropriately.'
    // $PEPE cashtag + bare ETH; bare "PEPE"/"DOGE" (no $) are not matched by
    // design, but $PEPE already covers PEPE.
    expect(has(tweet)).toEqual(['ETH', 'PEPE'])
  })

  it('extracts multiple distinct cashtags, deduped', () => {
    expect(has('rotating out of $SOL into $LINK and $LINK again')).toEqual(['LINK', 'SOL'])
  })

  it('matches full coin names as whole words', () => {
    expect(has('bitcoin and solana leading, dogecoin lagging')).toEqual(['BTC', 'DOGE', 'SOL'])
  })

  it('does NOT match ambiguous bare tickers in prose', () => {
    // "sol"/"link"/"op" as plain words must not resolve — the whole reason
    // tickers_mentioned matters for the ambiguous-ticker cleanup.
    expect(has('sitting in the sun, a vital link, top of the day')).toEqual([])
  })

  it('does NOT match coin names that are English words without a cashtag', () => {
    expect(has('the yield curve steepened and interest compounds')).toEqual([])
    expect(has('$CRV farming on curve')).toEqual(['CRV'])
  })

  it('treats BTC/ETH bare uppercase as valid (famous, unambiguous)', () => {
    expect(has('BTC and ETH both green today')).toEqual(['BTC', 'ETH'])
  })

  it('returns [] for empty or non-crypto text', () => {
    expect(extractTickers('')).toEqual([])
    expect(extractTickers('just had a great sandwich')).toEqual([])
  })
})
