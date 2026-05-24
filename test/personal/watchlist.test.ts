import { describe, it, expect } from 'vitest'
import { getUserTickers, hydrateTickers } from '@/lib/personal/watchlist'

/**
 * Minimal stub of the Supabase query builder that records the table the
 * caller asked for and replays a canned response. Each `from(table)` returns
 * a chainable object whose terminal `.then`/await resolves to a `{data}`
 * response we control via `responses` keyed on a path tag.
 */
type Canned = { data: any; error?: any }
function makeSupabase(responses: Record<string, Canned>) {
  const calls: Array<{ table: string; tag: string }> = []

  function builder(table: string) {
    const ctx: any = { _table: table, _filters: [] }
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) { ctx._filters.push(`eq:${col}=${val}`); return chain },
      gte() { return chain },
      ilike(col: string, val: any) { ctx._filters.push(`ilike:${col}=${val}`); return chain },
      order() { return chain },
      limit() { return chain },
      then(resolve: any) {
        const tag = `${table}:${ctx._filters.join('|')}`
        calls.push({ table, tag })
        const exact = responses[tag]
        const fallback = responses[table]
        const resp = exact ?? fallback ?? { data: [] }
        resolve(resp)
      },
    }
    return chain
  }
  return { from: builder, _calls: calls }
}

describe('getUserTickers', () => {
  it('returns empty when userId is missing', async () => {
    const sb = makeSupabase({})
    const out = await getUserTickers('', sb)
    expect(out).toEqual([])
  })

  it('merges holdings + watchlist with holdings taking precedence', async () => {
    const sb = makeSupabase({
      user_holdings: { data: [{ ticker: 'BTC' }, { ticker: 'eth' }] },
      user_watchlist: { data: [{ ticker: 'ETH' }, { ticker: 'SOL' }] },
    })
    const out = await getUserTickers('user-1', sb)
    expect(out).toHaveLength(3)
    const byTicker = Object.fromEntries(out.map((x) => [x.ticker, x.source]))
    expect(byTicker.BTC).toBe('holding')
    expect(byTicker.ETH).toBe('holding')
    expect(byTicker.SOL).toBe('watchlist')
  })

  it('drops malformed tickers (length / charset filter)', async () => {
    const sb = makeSupabase({
      user_holdings: {
        data: [
          { ticker: 'BTC' },
          { ticker: '' },
          { ticker: null },
          { ticker: 'TOOLONGTICKER123' },
          { ticker: 'BAD<TAG>' },
        ],
      },
      user_watchlist: { data: [] },
    })
    const out = await getUserTickers('user-1', sb)
    expect(out.map((x) => x.ticker)).toEqual(['BTC'])
  })
})

describe('hydrateTickers', () => {
  it('returns [] for empty input without hitting the database', async () => {
    const sb = makeSupabase({})
    const out = await hydrateTickers([], sb)
    expect(out).toEqual([])
    expect(sb._calls).toHaveLength(0)
  })

  it('populates price, change percentages and classifies whale flow direction', async () => {
    const sb = makeSupabase({
      price_snapshots: {
        data: [{ price_usd: 60000, price_change_24h: 1.2, price_change_7d: -3.4 }],
      },
      all_whale_transactions: {
        data: [
          { usd_value: 5_000_000, classification: 'buy' },
          { usd_value: 500_000, classification: 'sell' },
        ],
      },
      news_articles: { data: [{ title: '  Big BTC headline  ' }] },
    })
    const out = await hydrateTickers([{ ticker: 'BTC', source: 'holding' }], sb)
    expect(out).toHaveLength(1)
    const item = out[0]
    expect(item.ticker).toBe('BTC')
    expect(item.price_usd).toBe(60000)
    expect(item.change_24h).toBe(1.2)
    expect(item.change_7d).toBe(-3.4)
    // net = 5M buy - 500k sell = +4.5M, well above the 100k flat threshold
    expect(item.net_flow_direction).toBe('up')
    expect(item.latest_headline).toBe('Big BTC headline')
  })

  it('returns null fields and flat direction when sources are empty', async () => {
    const sb = makeSupabase({
      price_snapshots: { data: [] },
      all_whale_transactions: { data: [] },
      news_articles: { data: [] },
    })
    const out = await hydrateTickers([{ ticker: 'SOL', source: 'watchlist' }], sb)
    expect(out[0].price_usd).toBeNull()
    expect(out[0].change_24h).toBeNull()
    expect(out[0].change_7d).toBeNull()
    expect(out[0].net_flow_24h_usd).toBeNull()
    expect(out[0].net_flow_direction).toBeNull()
    expect(out[0].latest_headline).toBeNull()
  })

  it('classifies near-zero whale flow as flat', async () => {
    const sb = makeSupabase({
      price_snapshots: { data: [{ price_usd: 1, price_change_24h: 0, price_change_7d: 0 }] },
      all_whale_transactions: {
        data: [
          { usd_value: 30_000, classification: 'buy' },
          { usd_value: 20_000, classification: 'sell' },
        ],
      },
      news_articles: { data: [] },
    })
    const out = await hydrateTickers([{ ticker: 'XYZ', source: 'watchlist' }], sb)
    expect(out[0].net_flow_direction).toBe('flat')
  })

  it('survives a thrown query (degrades the failing field to null)', async () => {
    const sb: any = {
      from(table: string) {
        if (table === 'price_snapshots') {
          return {
            select() { return this },
            eq() { return this },
            order() { return this },
            limit() {
              throw new Error('boom')
            },
          }
        }
        // Other tables behave normally and return empty.
        const chain: any = {
          select() { return chain },
          eq() { return chain },
          gte() { return chain },
          ilike() { return chain },
          order() { return chain },
          limit() { return chain },
          then(resolve: any) { resolve({ data: [] }) },
        }
        return chain
      },
    }
    const out = await hydrateTickers([{ ticker: 'BTC', source: 'holding' }], sb)
    expect(out[0].price_usd).toBeNull()
    expect(out[0].ticker).toBe('BTC')
  })
})
