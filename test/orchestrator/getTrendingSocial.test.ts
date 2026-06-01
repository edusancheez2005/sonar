import { describe, it, expect } from 'vitest'
import { run as runGetTrendingSocial } from '@/lib/orca/orchestrator/tools/getTrendingSocial'

const now = () => new Date('2026-06-01T00:00:00Z')
const noopSupabase = {} as any

function fakeFetch(body: any, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as any) as typeof fetch
}

const ORIGINAL_KEY = process.env.LUNARCRUSH_API_KEY

describe('getTrendingSocial', () => {
  it('returns lunarcrush_unconfigured when no API key', async () => {
    delete process.env.LUNARCRUSH_API_KEY
    const r = await runGetTrendingSocial({}, noopSupabase, now, fakeFetch({ data: [] }))
    expect(r.ok).toBe(false)
    expect(r.error).toBe('lunarcrush_unconfigured')
    if (ORIGINAL_KEY) process.env.LUNARCRUSH_API_KEY = ORIGINAL_KEY
  })

  it('ranks by galaxy_score and drops tiny / low-activity tokens', async () => {
    process.env.LUNARCRUSH_API_KEY = 'test-key'
    const body = {
      data: [
        { symbol: 'btc', name: 'Bitcoin', market_cap: 1e12, interactions_24h: 500000, galaxy_score: 70 },
        { symbol: 'sol', name: 'Solana', market_cap: 5e10, interactions_24h: 200000, galaxy_score: 85 },
        // dust: galaxy_score 100 but no market cap / activity — must be dropped
        { symbol: 'scam', name: 'Scam', market_cap: 1000, interactions_24h: 5, galaxy_score: 100 },
      ],
    }
    const r = await runGetTrendingSocial({ limit: 5 }, noopSupabase, now, fakeFetch(body))
    expect(r.ok).toBe(true)
    expect(r.source).toBe('lunarcrush_coins_list')
    const symbols = (r.data as any).coins.map((c: any) => c.symbol)
    expect(symbols).toEqual(['SOL', 'BTC'])
    expect(symbols).not.toContain('SCAM')
  })

  it('honours the sort param (interactions_24h)', async () => {
    process.env.LUNARCRUSH_API_KEY = 'test-key'
    const body = {
      data: [
        { symbol: 'btc', market_cap: 1e12, interactions_24h: 900000, galaxy_score: 60 },
        { symbol: 'sol', market_cap: 5e10, interactions_24h: 100000, galaxy_score: 99 },
      ],
    }
    const r = await runGetTrendingSocial({ sort: 'interactions_24h' }, noopSupabase, now, fakeFetch(body))
    expect((r.data as any).coins[0].symbol).toBe('BTC')
  })

  it('maps a 429 to lunarcrush_quota_exhausted', async () => {
    process.env.LUNARCRUSH_API_KEY = 'test-key'
    const r = await runGetTrendingSocial({}, noopSupabase, now, fakeFetch({}, false, 429))
    expect(r.ok).toBe(false)
    expect(r.error).toBe('lunarcrush_quota_exhausted')
  })

  it('returns no_trending_data when everything is filtered out', async () => {
    process.env.LUNARCRUSH_API_KEY = 'test-key'
    const body = { data: [{ symbol: 'dust', market_cap: 100, interactions_24h: 1, galaxy_score: 100 }] }
    const r = await runGetTrendingSocial({}, noopSupabase, now, fakeFetch(body))
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_trending_data')
  })
})
