import { describe, it, expect } from 'vitest'
import { run as runGetTrendingWhales } from '@/lib/orca/orchestrator/tools/getTrendingWhales'

const now = () => new Date('2026-06-01T00:00:00Z')

function fakeSupabase(rows: any[] | { error: { message: string } }) {
  return {
    from(_t: string) {
      return {
        select(_c: string) {
          return this
        },
        gte(_c: string, _v: any) {
          return this
        },
        order(_c: string, _o: any) {
          return this
        },
        async limit(_n: number) {
          if (!Array.isArray(rows)) return { data: null, error: (rows as any).error }
          return { data: rows, error: null }
        },
      }
    },
  } as any
}

describe('getTrendingWhales', () => {
  it('aggregates buys/sells by ticker and ranks by abs net flow', async () => {
    const rows = [
      // BTC: large net buy
      { token_symbol: 'BTC', usd_value: 5_000_000, classification: 'buy', whale_address: 'a', timestamp: '' },
      { token_symbol: 'BTC', usd_value: 1_000_000, classification: 'sell', whale_address: 'b', timestamp: '' },
      // ETH: moderate net sell
      { token_symbol: 'ETH', usd_value: 800_000, classification: 'sell', whale_address: 'c', timestamp: '' },
      { token_symbol: 'ETH', usd_value: 200_000, classification: 'buy', whale_address: 'd', timestamp: '' },
      // SOL: tiny net flow under the floor, must be filtered
      { token_symbol: 'SOL', usd_value: 30_000, classification: 'buy', whale_address: 'e', timestamp: '' },
      { token_symbol: 'SOL', usd_value: 10_000, classification: 'sell', whale_address: 'f', timestamp: '' },
    ]
    const r = await runGetTrendingWhales({ window: '7d', limit: 5 }, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const tokens = (r.data as any).tokens
    expect(tokens.map((t: any) => t.ticker)).toEqual(['BTC', 'ETH'])
    expect(tokens[0].direction).toBe('up')
    expect(tokens[0].net_usd).toBe(4_000_000)
    expect(tokens[1].direction).toBe('down')
    expect(tokens[1].net_usd).toBe(-600_000)
  })

  it('defaults window to 7d', async () => {
    const r = await runGetTrendingWhales(
      {},
      fakeSupabase([
        { token_symbol: 'BTC', usd_value: 5_000_000, classification: 'buy', whale_address: 'a', timestamp: '' },
        { token_symbol: 'BTC', usd_value: 0, classification: 'sell', whale_address: 'b', timestamp: '' },
        { token_symbol: 'BTC', usd_value: 100, classification: 'sell', whale_address: 'b', timestamp: '' },
      ]),
      now
    )
    expect(r.ok).toBe(true)
    expect((r.data as any).window).toBe('7d')
  })

  it('returns no_whale_transactions when the table is empty', async () => {
    const r = await runGetTrendingWhales({}, fakeSupabase([]), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_whale_transactions')
  })

  it('returns no_significant_whale_flows when nothing clears the floor', async () => {
    const rows = [
      { token_symbol: 'TINY', usd_value: 5_000, classification: 'buy', whale_address: 'a', timestamp: '' },
      { token_symbol: 'TINY', usd_value: 1_000, classification: 'sell', whale_address: 'b', timestamp: '' },
    ]
    const r = await runGetTrendingWhales({}, fakeSupabase(rows), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_significant_whale_flows')
  })

  it('caps limit to MAX_LIMIT and floors invalid input', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      token_symbol: `T${i.toString().padStart(2, '0')}`,
      usd_value: 1_000_000 + i * 100_000,
      classification: 'buy',
      whale_address: `w${i}`,
      timestamp: '',
    }))
    // duplicate each so each ticker passes the 2-tx floor
    const doubled = rows.flatMap((r) => [r, { ...r, classification: 'sell', usd_value: 200_000 }])
    const r = await runGetTrendingWhales({ limit: 999 }, fakeSupabase(doubled), now)
    expect(r.ok).toBe(true)
    expect((r.data as any).tokens.length).toBe(25)
  })

  it('rejects malformed ticker strings', async () => {
    const rows = [
      { token_symbol: 'this is not a ticker', usd_value: 2_000_000, classification: 'buy', whale_address: 'a', timestamp: '' },
      { token_symbol: 'this is not a ticker', usd_value: 100_000, classification: 'sell', whale_address: 'b', timestamp: '' },
      { token_symbol: 'BTC', usd_value: 5_000_000, classification: 'buy', whale_address: 'c', timestamp: '' },
      { token_symbol: 'BTC', usd_value: 100_000, classification: 'sell', whale_address: 'd', timestamp: '' },
    ]
    const r = await runGetTrendingWhales({}, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const tokens = (r.data as any).tokens
    expect(tokens.map((t: any) => t.ticker)).toEqual(['BTC'])
  })

  it('normalises window aliases (week / today / month)', async () => {
    const rows = [
      { token_symbol: 'BTC', usd_value: 5_000_000, classification: 'buy', whale_address: 'a', timestamp: '' },
      { token_symbol: 'BTC', usd_value: 100_000, classification: 'sell', whale_address: 'b', timestamp: '' },
    ]
    const week = await runGetTrendingWhales({ window: 'this week' }, fakeSupabase(rows), now)
    const today = await runGetTrendingWhales({ window: 'today' }, fakeSupabase(rows), now)
    const month = await runGetTrendingWhales({ window: 'month' }, fakeSupabase(rows), now)
    expect((week.data as any).window).toBe('7d')
    expect((today.data as any).window).toBe('24h')
    expect((month.data as any).window).toBe('30d')
  })

  it('surfaces query_failed on supabase error', async () => {
    const r = await runGetTrendingWhales({}, fakeSupabase({ error: { message: 'boom' } } as any), now)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('query_failed')
  })
})
