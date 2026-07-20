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

  it('proceeds chainless when the chain arg is unrecognisable (address query needs no chain)', async () => {
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: '0xabc', chain: 'doge' } },
      stubSupabase({}),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).chain).toBeNull()
  })

  it('accepts planner-style chain aliases like "solana" (2026-07-18 invalid_args regression)', async () => {
    const r = await executeTool(
      {
        tool: 'getWalletActivity',
        args: { address: '2yrks4xgzgkqpgepxurcc5zttxgxqundmwc9kf9ndpnz', chain: 'solana' },
      },
      stubSupabase({ all_whale_transactions: { data: [] } }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).chain).toBe('sol')
  })

  it('infers the chain from the address shape when no chain is given', async () => {
    const r = await executeTool(
      {
        tool: 'getWalletActivity',
        args: { address: '0x28c6c06298d514db089934071355e5743bf21d60' },
      },
      stubSupabase({ all_whale_transactions: { data: [] } }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).chain).toBe('eth')
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

/**
 * Param-aware stub for the window-widening + case tests: records eq/in/rpc
 * arguments and lets the rpc handler answer per (fn, params).
 */
function stubSupabaseW3(
  tables: Record<string, any>,
  rpc?: (fn: string, params: any) => any
) {
  const calls = { filters: [] as Array<[string, any]>, rpc: [] as Array<[string, any]> }
  function builder(table: string) {
    const chain: any = {
      select() { return chain },
      eq(col: string, val: any) { calls.filters.push([col, val]); return chain },
      in(col: string, vals: any) { calls.filters.push([col, vals]); return chain },
      gte() { return chain },
      order() { return chain },
      limit() { return chain },
      then(resolve: any) { resolve(tables[table] ?? { data: [] }) },
    }
    return chain
  }
  const sb: any = { from: builder, calls }
  if (rpc) {
    sb.rpc = async (fn: string, params: any) => {
      calls.rpc.push([fn, params])
      return { data: rpc(fn, params) }
    }
  }
  return sb
}

describe('executeTool: getWalletActivity — window widening + address case', () => {
  // now = 2026-06-02T12:00Z. Wallet last active 2026-05-30 → outside 24h,
  // inside 7d. Whale addresses are stored lowercased in the DB.
  const MIXED = '2YrKs4XgZgKqPgEpXuRcC5zTtXgXqUnDmWc9kF9nDpNz'
  const LOWER = MIXED.toLowerCase()

  const rpcHandler = (fn: string, params: any) => {
    if (fn === 'wallet_tx_stats' && String(params.p_since).startsWith('1970')) {
      return [{ tx_count: 738, buy_volume: 2600000, sell_volume: 4700000, last_active: '2026-05-30T12:00:00Z' }]
    }
    if (fn === 'wallet_tx_stats') {
      return [{ tx_count: 12, buy_volume: 10000, sell_volume: 5000, last_active: '2026-05-30T12:00:00Z' }]
    }
    if (fn === 'wallet_token_flows') {
      return [{ token_symbol: 'bonk', buy_usd: 10000, sell_usd: 5000, total_usd: 15000 }]
    }
    return []
  }

  it('lowercases the address for every DB lookup and echoes the original back', async () => {
    const sb = stubSupabaseW3(
      { all_whale_transactions: { data: [] } },
      rpcHandler
    )
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: MIXED, chain: 'sol' } },
      sb,
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).address).toBe(MIXED)
    // every whale_address filter and every rpc p_address must be lowercase
    const addrFilters = sb.calls.filters.filter(([c]: any) => c === 'whale_address')
    expect(addrFilters.length).toBeGreaterThan(0)
    for (const [, v] of addrFilters) expect(v).toBe(LOWER)
    for (const [, params] of sb.calls.rpc) expect(params.p_address).toBe(LOWER)
  })

  it('auto-widens to 7d when the last activity is older than 24h', async () => {
    const sb = stubSupabaseW3(
      {
        all_whale_transactions: {
          data: [{ usd_value: 8000, classification: 'BUY', token_symbol: 'bonk', timestamp: 't1', transaction_hash: 'h1' }],
        },
      },
      rpcHandler
    )
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: LOWER, chain: 'sol' } },
      sb,
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.window).toBe('7d')
    expect(d.window_auto_widened).toBe(true)
    expect(d.tx_count).toBe(12)
    expect(d.net_flow_usd).toBe(5000)
    expect(d.tokens_touched).toContain('BONK')
    expect(d.lifetime).toEqual({
      tx_count: 738,
      buy_usd: 2600000,
      sell_usd: 4700000,
      net_flow_usd: -2100000,
      last_active: '2026-05-30T12:00:00Z',
    })
  })

  it('reports 30d zeros plus the lifetime story for a dormant wallet', async () => {
    const dormantRpc = (fn: string, params: any) => {
      if (fn === 'wallet_tx_stats' && String(params.p_since).startsWith('1970')) {
        return [{ tx_count: 50, buy_volume: 100000, sell_volume: 40000, last_active: '2026-01-15T00:00:00Z' }]
      }
      if (fn === 'wallet_tx_stats') {
        return [{ tx_count: 0, buy_volume: 0, sell_volume: 0, last_active: null }]
      }
      return []
    }
    const sb = stubSupabaseW3({ all_whale_transactions: { data: [] } }, dormantRpc)
    const r = await executeTool(
      { tool: 'getWalletActivity', args: { address: LOWER, chain: 'sol' } },
      sb,
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.window).toBe('30d')
    expect(d.window_auto_widened).toBe(true)
    expect(d.tx_count).toBe(0)
    expect(d.lifetime.tx_count).toBe(50)
    expect(d.lifetime.last_active).toBe('2026-01-15T00:00:00Z')
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
      { tool: 'getArticleContext', args: { articleId: '5f0e8a3c-1b2d-4c5e-9f0a-1b2c3d4e5f60' } },
      stubSupabase({ news_items: { data: [] } }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).found).toBe(false)
  })

  it('shapes a found article from news_items columns', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: { articleId: '5f0e8a3c-1b2d-4c5e-9f0a-1b2c3d4e5f60' } },
      stubSupabase({
        news_items: {
          data: [
            {
              id: '5f0e8a3c-1b2d-4c5e-9f0a-1b2c3d4e5f60',
              title: 'Fed holds rates',
              url: 'https://news.example/x',
              source: 'Reuters',
              published_at: '2026-06-02T10:00:00Z',
              content: 'The Fed held rates...',
              ticker: 'BTC',
              author: 'Reuters Desk',
              sentiment_raw: 0.2,
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
    expect(d.excerpt).toBe('The Fed held rates...')
    expect(d.related_tickers).toEqual(['BTC'])
    expect(d.sentiment_score).toBe(0.2)
  })

  it('reroutes a non-uuid articleId into a title search instead of a uuid cast error', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: { articleId: 'CLARITY' } },
      stubSupabase({
        news_items: {
          data: [
            {
              id: '5f0e8a3c-1b2d-4c5e-9f0a-1b2c3d4e5f60',
              title: 'Top 3 Altcoins That Could Benefit Most if the CLARITY Act Passes',
              url: 'https://news.example/clarity',
              source: 'CoinGape',
              published_at: '2026-06-02T10:00:00Z',
              content: null,
              ticker: 'BTC',
              author: null,
              sentiment_raw: null,
            },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.found).toBe(true)
    expect(d.headline).toContain('CLARITY Act')
  })

  it('finds an article by titleQuery keywords', async () => {
    const r = await executeTool(
      { tool: 'getArticleContext', args: { titleQuery: 'CLARITY Act altcoins' } },
      stubSupabase({
        news_items: {
          data: [
            {
              id: '5f0e8a3c-1b2d-4c5e-9f0a-1b2c3d4e5f60',
              title: 'Top 3 Altcoins That Could Benefit Most if the CLARITY Act Passes',
              url: 'https://news.example/clarity',
              source: 'CoinGape',
              published_at: '2026-06-02T10:00:00Z',
              content: 'Congress weighs the CLARITY Act…',
              ticker: 'BTC',
              author: null,
              sentiment_raw: 0.4,
            },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.found).toBe(true)
    expect(d.headline).toContain('CLARITY Act')
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
