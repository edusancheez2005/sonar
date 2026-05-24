import { describe, it, expect } from 'vitest'
import { executeTool } from '@/lib/orca/orchestrator/tools/registry'

/**
 * Stub supabase tailored to the W3 tools. Returns canned rows per table
 * name, ignoring filters (the tool's job is to translate filters to a
 * Supabase query; we exercise the shaping logic on the result).
 */
function stubSupabase(responses: Record<string, any>) {
  function builder(table: string) {
    const chain: any = {
      select() { return chain },
      eq() { return chain },
      gte() { return chain },
      ilike() { return chain },
      or() { return chain },
      order() { return chain },
      limit() { return chain },
      then(resolve: any) { resolve(responses[table] ?? { data: [] }) },
    }
    return chain
  }
  return { from: builder }
}

const now = () => new Date('2026-06-02T12:00:00Z')

describe('executeTool: getWalletActivity', () => {
  it('rejects invalid address / chain', async () => {
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: '', chain: 'eth' } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })

  it('rejects unknown chain', async () => {
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: '0xabc', chain: 'doge' } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })

  it('aggregates buy/sell USD and reports labels + top txs', async () => {
    const r = await executeTool(
      {
        tool: 'getWalletActivity',
        args: { address: '0xabc123', chain: 'eth', userId: 'user-1234' },
      },
      stubSupabase({
        all_whale_transactions: {
          data: [
            { usd_value: 1_000_000, classification: 'buy', token_symbol: 'eth', timestamp: 't1', transaction_hash: 'h1' },
            { usd_value: 250_000, classification: 'sell', token_symbol: 'usdc', timestamp: 't2', transaction_hash: 'h2' },
          ],
        },
        tracked_address_universe: { data: [{ arkham_entity_name: 'Binance: Hot Wallet 7', arkham_label: 'Binance' }] },
        user_wallets: { data: [{ label: 'My exchange wallet' }] },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.tx_count).toBe(2)
    expect(d.buy_usd).toBe(1_000_000)
    expect(d.sell_usd).toBe(250_000)
    expect(d.net_flow_usd).toBe(750_000)
    expect(d.tokens_touched).toContain('ETH')
    expect(d.tokens_touched).toContain('USDC')
    expect(d.top_txs).toHaveLength(2)
    // user label wins over arkham label
    expect(d.label).toBe('My exchange wallet')
    expect(d.label_source).toBe('user')
  })
})

describe('executeTool: getArticleContext', () => {
  it('rejects when no id or url is supplied', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: {} },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })

  it('returns found=false when the article is missing', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: { articleId: 'abc123' } },
      stubSupabase({ news_articles: { data: [] } }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).found).toBe(false)
  })

  it('shapes a found article with related tickers', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: { articleId: 'abc123' } },
      stubSupabase({
        news_articles: {
          data: [
            {
              id: 'abc123',
              title: 'Fed holds rates',
              url: 'https://news.example/x',
              source: 'Reuters',
              published_at: '2026-06-02T10:00:00Z',
              summary: 'The Fed held rates...',
              related_tickers: 'BTC,ETH',
              sentiment_score: 0.2,
            },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.found).toBe(true)
    expect(d.headline).toBe('Fed holds rates')
    expect(d.related_tickers).toEqual(['BTC', 'ETH'])
    expect(d.sentiment_score).toBe(0.2)
  })
})

describe('executeTool: getSignalContext', () => {
  it('rejects invalid ticker', async () => {
    const r = await executeTool(
      { tool: 'getSignalContext', args: {} },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_ticker')
  })

  it('returns sample_count, last_verdict and flip count', async () => {
    const r = await executeTool(
      { tool: 'getSignalContext', args: { ticker: 'SOL' } },
      stubSupabase({
        token_signals: {
          data: [
            { signal: 'STRONG BUY', score: 80, confidence: 78, computed_at: 't3', timeframe: '24h' },
            { signal: 'NEUTRAL', score: 50, confidence: 60, computed_at: 't2', timeframe: '24h' },
            { signal: 'STRONG BUY', score: 78, confidence: 70, computed_at: 't1', timeframe: '24h' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.sample_count).toBe(3)
    expect(d.last_verdict.signal).toBe('STRONG BUY')
    expect(d.flip_count).toBe(2)
    expect(d.suspect).toBe(false) // threshold is > 2
  })
})

describe('executeTool: findTrackedWallets', () => {
  it('rejects too-short queries', async () => {
    const r = await executeTool(
      { tool: 'findTrackedWallets', args: { query: 'a' } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_query')
  })

  it('merges user_wallets and tracked_address_universe with dedupe', async () => {
    const r = await executeTool(
      { tool: 'findTrackedWallets', args: { query: 'binance', userId: 'user-1234' } },
      stubSupabase({
        user_wallets: {
          data: [{ address: '0xAAA', chain: 'eth', label: 'My binance' }],
        },
        tracked_address_universe: {
          data: [
            { address: '0xAAA', chain: 'eth', arkham_entity_name: 'Binance Hot', arkham_label: null },
            { address: '0xBBB', chain: 'eth', arkham_entity_name: 'Binance Cold', arkham_label: null },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const matches = (r.data as any).matches as Array<any>
    expect(matches).toHaveLength(2)
    expect(matches[0].source).toBe('user')
    expect(matches[0].label).toBe('My binance')
    // dedup: 0xAAA from arkham should not appear again
    expect(matches.filter((m) => m.address === '0xAAA')).toHaveLength(1)
    expect(matches[1].address).toBe('0xBBB')
    expect(matches[1].source).toBe('arkham')
  })
})
