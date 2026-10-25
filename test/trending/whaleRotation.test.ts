import { describe, it, expect } from 'vitest'
import { shapeRotation, countPosts } from '@/lib/trending/whaleRotation'

const tok = (symbol: string, netUsd: number, buys = 3, sells = 2, volumeUsd = Math.abs(netUsd) * 3) => ({
  symbol, netUsd, buyCount: buys, sellCount: sells, uniqueWhales: buys + sells, volumeUsd,
  buyUsd: 0, sellUsd: 0, robustNetUsd: netUsd, excluded: { junk: 0, exchangeInternal: 0, overCap: 0, stablecoin: 0 },
})

const snap: any = {
  generated_at: '2026-10-25T14:40:00Z',
  chains_live: ['ethereum'],
  tokens: [tok('BTC', -35e6), tok('LINK', 1.26e6), tok('ONE', 9e6, 1, 0), tok('SHIB', 1.09e6), tok('ETHFI', -13e6), tok('UNI', 8e5), tok('A', 5e5), tok('B', 4e5), tok('C', 3e5)],
}

describe('shapeRotation', () => {
  it('takes the five largest inflows and outflows by the dashboard netUsd', () => {
    const r = shapeRotation(snap)
    expect(r.inflows.map((x) => x.symbol)).toEqual(['LINK', 'SHIB', 'UNI', 'A', 'B'])
    expect(r.outflows.map((x) => x.symbol)).toEqual(['BTC', 'ETHFI'])
    expect(r.inflows[0].netUsd).toBe(1.26e6)
  })
  it('needs at least two counted trades', () => {
    expect(shapeRotation(snap).inflows.map((x) => x.symbol)).not.toContain('ONE')
  })
  it('labels chains from chains_live and carries the definition', () => {
    const r = shapeRotation(snap)
    expect(r.chains_label).toMatch(/Ethereum/)
    expect(r.definition).toMatch(/^Net flow = /)
    expect(r.inflows[0].tone).toBe('in')
    expect(r.outflows[0].tone).toBe('out')
  })
})

describe('countPosts', () => {
  const now = Date.parse('2026-10-25T12:00:00Z')
  it('counts each ticker once per post in the last 24 h and the 24 h before', () => {
    const posts = [
      { tickers_mentioned: ['BTC', '$BTC'], published_at: '2026-10-25T11:00:00Z' },
      { tickers_mentioned: ['btc', 'ETH'], published_at: '2026-10-25T01:00:00Z' },
      { tickers_mentioned: ['BTC'], published_at: '2026-10-24T01:00:00Z' },
      { tickers_mentioned: 'not-an-array', published_at: '2026-10-25T01:00:00Z' },
      { tickers_mentioned: ['SOL'], published_at: null },
    ]
    const c = countPosts(posts, ['BTC', 'ETH', 'SOL'], now)
    expect(c.get('BTC')).toEqual({ last: 2, prev: 1 })
    expect(c.get('ETH')).toEqual({ last: 1, prev: 0 })
    expect(c.get('SOL')).toEqual({ last: 0, prev: 0 })
  })
})
