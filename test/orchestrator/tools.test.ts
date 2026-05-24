import { describe, it, expect, vi } from 'vitest'
import { executeTool } from '@/lib/orca/orchestrator/tools/registry'

function stubSupabase(responses: Record<string, any>) {
  function builder(table: string) {
    const ctx: any = { _table: table, _filters: [] }
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) { ctx._filters.push(`${col}=${val}`); return chain },
      gte() { return chain },
      ilike() { return chain },
      or() { return chain },
      order() { return chain },
      limit() { return chain },
      upsert(payload: any, opts: any) {
        ctx._upsert = { payload, opts }
        return { error: responses[`${table}:upsert_error`] ?? null }
      },
      delete() { ctx._delete = true; return chain },
      then(resolve: any) { resolve(responses[table] ?? { data: [] }) },
    }
    return chain
  }
  return { from: builder }
}

const now = () => new Date('2026-05-26T12:00:00Z')

describe('executeTool: getPrice', () => {
  it('returns ok=false when ticker is missing', async () => {
    const r = await executeTool({ tool: 'getPrice', args: {} }, stubSupabase({}), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_ticker')
  })

  it('returns the latest price row as structured data', async () => {
    const r = await executeTool(
      { tool: 'getPrice', args: { ticker: 'BTC' } },
      stubSupabase({
        price_snapshots: { data: [{ price_usd: 60000, price_change_24h: 1.2, price_change_7d: -3.4, timestamp: 't' }] },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).price_usd).toBe(60000)
    expect(r.source).toBe('price_snapshots')
  })

  it('returns ok=false when no row exists', async () => {
    const r = await executeTool(
      { tool: 'getPrice', args: { ticker: 'XYZ' } },
      stubSupabase({ price_snapshots: { data: [] } }),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_data')
  })
})

describe('executeTool: getWhaleFlows', () => {
  it('sums buy/sell and classifies direction', async () => {
    const r = await executeTool(
      { tool: 'getWhaleFlows', args: { ticker: 'BTC' } },
      stubSupabase({
        all_whale_transactions: {
          data: [
            { usd_value: 5_000_000, classification: 'buy', whale_address: 'w1' },
            { usd_value: 500_000, classification: 'sell', whale_address: 'w2' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).direction).toBe('up')
    expect((r.data as any).net_usd).toBe(4_500_000)
    expect((r.data as any).unique_whales).toBe(2)
  })
})

describe('executeTool: getNews', () => {
  it('returns a normalised items array', async () => {
    const r = await executeTool(
      { tool: 'getNews', args: { ticker: 'BTC' } },
      stubSupabase({
        news_articles: {
          data: [{ title: 'Headline', url: 'https://x', source: 's', published_at: 'p', summary: 'sum' }],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).items).toHaveLength(1)
    expect((r.data as any).items[0].title).toBe('Headline')
  })
})

describe('executeTool: explainMacroFactor', () => {
  it('returns a glossary entry for known terms', async () => {
    const r = await executeTool(
      { tool: 'explainMacroFactor', args: { entities: ['CPI', 'random'] } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(true)
    const matches = (r.data as any).matches
    expect(matches.length).toBe(1)
    expect(matches[0].key).toBe('cpi')
  })
})

describe('executeTool: user-scoped tools', () => {
  it('rejects calls without a userId', async () => {
    const r = await executeTool({ tool: 'getUserHoldings', args: {} }, stubSupabase({}), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_user')
  })

  it('returns watchlist tickers uppercased', async () => {
    const r = await executeTool(
      { tool: 'getUserWatchlist', args: { userId: 'user-1234' } },
      stubSupabase({ user_watchlist: { data: [{ ticker: 'btc' }, { ticker: 'eth' }] } }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).tickers).toEqual(['BTC', 'ETH'])
  })
})

describe('executeTool: addToWatchlist (write-tool)', () => {
  it('rejects when args are invalid', async () => {
    const r = await executeTool({ tool: 'addToWatchlist', args: {} }, stubSupabase({}), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })

  it('reports success when upsert succeeds', async () => {
    const r = await executeTool(
      { tool: 'addToWatchlist', args: { userId: 'user-1234', ticker: 'sol' } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).ticker).toBe('SOL')
  })
})

describe('executeTool: getSignalHistory', () => {
  it('returns the not-yet-wired sentinel', async () => {
    const r = await executeTool({ tool: 'getSignalHistory', args: {} }, stubSupabase({}), now)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('signals_pipeline_not_yet_wired')
  })
})
