import { describe, it, expect } from 'vitest'
import { run as runGetMostActiveWallets } from '@/lib/orca/orchestrator/tools/getMostActiveWallets'

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

describe('getMostActiveWallets', () => {
  it('ranks wallets by tx count, tie-broken by total USD', async () => {
    const rows = [
      // wallet A: 3 txns, $6M total
      { whale_address: '0xA', usd_value: 4_000_000, classification: 'BUY', token_symbol: 'BTC', timestamp: '' },
      { whale_address: '0xA', usd_value: 1_000_000, classification: 'SELL', token_symbol: 'ETH', timestamp: '' },
      { whale_address: '0xA', usd_value: 1_000_000, classification: 'BUY', token_symbol: 'SOL', timestamp: '' },
      // wallet B: 2 txns, $10M total
      { whale_address: '0xB', usd_value: 7_000_000, classification: 'BUY', token_symbol: 'BTC', timestamp: '' },
      { whale_address: '0xB', usd_value: 3_000_000, classification: 'SELL', token_symbol: 'ETH', timestamp: '' },
      // wallet C: 3 txns, $4M total
      { whale_address: '0xC', usd_value: 2_000_000, classification: 'ACCUMULATION', token_symbol: 'BTC', timestamp: '' },
      { whale_address: '0xC', usd_value: 1_500_000, classification: 'DISTRIBUTION', token_symbol: 'XRP', timestamp: '' },
      { whale_address: '0xC', usd_value: 500_000, classification: 'BUY', token_symbol: 'BTC', timestamp: '' },
    ]
    const r = await runGetMostActiveWallets({ window: '24h', limit: 10 }, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const data = r.data as any
    expect(data.window).toBe('24h')
    // A and C both have 3 txns; A wins on volume ($6M > $4M). B is last with 2 txns.
    expect(data.wallets.map((w: any) => w.address)).toEqual(['0xA', '0xC', '0xB'])
    expect(data.wallets[0].tx_count).toBe(3)
    expect(data.wallets[0].total_usd).toBe(6_000_000)
    expect(data.wallets[0].buy_usd).toBe(5_000_000)
    expect(data.wallets[0].sell_usd).toBe(1_000_000)
    expect(data.wallets[0].net_usd).toBe(4_000_000)
    expect(data.wallets[0].tokens.sort()).toEqual(['BTC', 'ETH', 'SOL'])
  })

  it('treats ACCUMULATION as buy and DISTRIBUTION as sell', async () => {
    const rows = [
      { whale_address: '0xZ', usd_value: 1_000_000, classification: 'ACCUMULATION', token_symbol: 'BTC', timestamp: '' },
      { whale_address: '0xZ', usd_value: 400_000, classification: 'DISTRIBUTION', token_symbol: 'BTC', timestamp: '' },
    ]
    const r = await runGetMostActiveWallets({}, fakeSupabase(rows), now)
    const w = (r.data as any).wallets[0]
    expect(w.buy_usd).toBe(1_000_000)
    expect(w.sell_usd).toBe(400_000)
    expect(w.net_usd).toBe(600_000)
  })

  it('defaults window to 24h and limit to 10', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      whale_address: `0x${i}`,
      usd_value: 1_000,
      classification: 'BUY',
      token_symbol: 'BTC',
      timestamp: '',
    }))
    const r = await runGetMostActiveWallets({}, fakeSupabase(rows), now)
    const data = r.data as any
    expect(data.window).toBe('24h')
    expect(data.wallets.length).toBe(10)
  })

  it('honours window aliases (week → 7d, today → 24h)', async () => {
    const rows = [
      { whale_address: '0xA', usd_value: 1, classification: 'BUY', token_symbol: 'BTC', timestamp: '' },
    ]
    const r1 = await runGetMostActiveWallets({ window: 'week' }, fakeSupabase(rows), now)
    expect((r1.data as any).window).toBe('7d')
    const r2 = await runGetMostActiveWallets({ window: 'today' }, fakeSupabase(rows), now)
    expect((r2.data as any).window).toBe('24h')
    const r3 = await runGetMostActiveWallets({ window: 'month' }, fakeSupabase(rows), now)
    expect((r3.data as any).window).toBe('30d')
  })

  it('errors no_wallet_activity when empty', async () => {
    const r = await runGetMostActiveWallets({}, fakeSupabase([]), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_wallet_activity')
  })

  it('surfaces query_failed on supabase error', async () => {
    const r = await runGetMostActiveWallets(
      {},
      fakeSupabase({ error: { message: 'boom' } } as any),
      now
    )
    expect(r.ok).toBe(false)
    expect(String(r.error)).toContain('query_failed')
  })

  it('caps the limit at 25', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      whale_address: `0x${i}`,
      usd_value: 1_000,
      classification: 'BUY',
      token_symbol: 'BTC',
      timestamp: '',
    }))
    const r = await runGetMostActiveWallets({ limit: 999 }, fakeSupabase(rows), now)
    expect((r.data as any).wallets.length).toBe(25)
  })
})
