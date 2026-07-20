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
        news_items: {
          data: [
            {
              title: 'Pakistan sells JF-17 fighter jets during Op Sindoor',
              url: 'https://x/1',
              source: 'HT',
              published_at: '2026-06-01',
              content: 'Geopolitics article.',
              ticker: 'OP',
            },
            {
              title: 'Optimism Layer-2 token OP rallies on airdrop',
              url: 'https://x/2',
              source: 'TheBlock',
              published_at: '2026-06-01',
              content: 'Crypto coverage of the OP token on the Optimism rollup.',
              ticker: 'OP',
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
        news_items: {
          data: [
            { title: 'Bitcoin steadies above $60K', url: 'u1', source: 's', published_at: 'p', content: 'BTC market recap', ticker: 'BTC' },
            { title: 'Bitcoin miners expand capacity', url: 'u2', source: 's', published_at: 'p', content: 'Mining coverage', ticker: 'BTC' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).items).toHaveLength(2)
  })

  it('keeps an ambiguous-ticker row when the cashtag form appears', async () => {
    const r = await executeTool(
      { tool: 'getNews', args: { ticker: 'OP' } },
      stubSupabase({
        news_items: {
          data: [
            { title: '$OP breaks out of its range', url: 'u', source: 's', published_at: 'p', content: 'Token coverage with $OP cashtag.', ticker: 'OP' },
          ],
        },
      }),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).items).toHaveLength(1)
  })
})
