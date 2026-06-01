import { describe, it, expect } from 'vitest'
import { executeTool } from '@/lib/orca/orchestrator/tools/registry'

function stubSupabase(responses: Record<string, any>) {
  return {
    from(table: string) {
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
    },
  } as any
}

const now = () => new Date('2026-06-01T00:00:00Z')

describe('getWhaleFlows: empty-data sentinel', () => {
  it('returns ok:false when no rows are returned', async () => {
    const r = await executeTool(
      { tool: 'getWhaleFlows', args: { ticker: 'OP' } },
      stubSupabase({ all_whale_transactions: { data: [] } }),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_whale_transactions_24h')
  })

  it('returns ok:false when rows exist but none classify as buy/sell', async () => {
    const r = await executeTool(
      { tool: 'getWhaleFlows', args: { ticker: 'OP' } },
      stubSupabase({
        all_whale_transactions: {
          data: [
            { usd_value: 1_000_000, classification: 'transfer', whale_address: 'w1' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_whale_transactions_24h')
  })
})

describe('getNews: short-ticker disambiguation', () => {
  it('drops OP/Op Sindoor-style headlines without crypto context', async () => {
    const r = await executeTool(
      { tool: 'getNews', args: { ticker: 'OP' } },
      stubSupabase({
        news_articles: {
          data: [
            {
              title: 'Pakistan sells JF-17 fighter jets during Op Sindoor',
              url: 'https://x/1',
              source: 'HT',
              published_at: '2026-06-01',
              summary: 'Geopolitics article.',
              related_tickers: 'OP,XYZ',
            },
            {
              title: 'Optimism Layer-2 token OP rallies on airdrop',
              url: 'https://x/2',
              source: 'TheBlock',
              published_at: '2026-06-01',
              summary: 'Crypto coverage of the OP token on the Optimism rollup.',
              related_tickers: 'OP',
            },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    const items = (r.data as any).items
    expect(items).toHaveLength(1)
    expect(items[0].title).toContain('Optimism')
  })

  it('keeps all matches for unambiguous tickers like BTC', async () => {
    const r = await executeTool(
      { tool: 'getNews', args: { ticker: 'BTC' } },
      stubSupabase({
        news_articles: {
          data: [
            { title: 'Plain headline', url: 'u1', source: 's', published_at: 'p', summary: 's', related_tickers: 'BTC' },
            { title: 'Another headline', url: 'u2', source: 's', published_at: 'p', summary: 's', related_tickers: 'BTC,ETH' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).items).toHaveLength(2)
  })

  it('drops rows whose related_tickers contains the ticker as a substring only', async () => {
    const r = await executeTool(
      { tool: 'getNews', args: { ticker: 'OP' } },
      stubSupabase({
        news_articles: {
          data: [
            { title: 'crypto news', url: 'u', source: 's', published_at: 'p', summary: 'blockchain', related_tickers: 'OPUL,STOP' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).items).toHaveLength(0)
  })
})
