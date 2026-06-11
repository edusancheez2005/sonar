import { describe, it, expect } from 'vitest'
import { run } from '@/lib/orca/orchestrator/tools/getWhaleFlows'

/** Stub that records the gte() cutoff and returns canned rows. */
function stubSupabase(rows: any[], labelRows: any[] = []) {
  const calls: any = { gte: null, table: null }
  function from(table: string) {
    calls.table = table
    const chain: any = {
      select() { return chain },
      eq() { return chain },
      gte(_col: string, val: string) { if (table === 'all_whale_transactions') calls.gte = val; return chain },
      order() { return chain },
      in() { return chain },
      limit() { return chain },
      then(resolve: any) {
        resolve({ data: table === 'tracked_address_universe' ? labelRows : rows })
      },
    }
    return chain
  }
  return { from, _calls: calls }
}

const now = () => new Date('2026-06-11T12:00:00Z')

describe('getWhaleFlows — window + top transactions (§ "biggest sellers" fix)', () => {
  it('returns invalid_ticker without a ticker', async () => {
    const r = await run({}, stubSupabase([]), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_ticker')
  })

  it('counts ACCUMULATION / DISTRIBUTION (multi-chain feed), not just buy/sell', async () => {
    const r = await run(
      { ticker: 'BTC', window: '7d' },
      stubSupabase([
        { usd_value: 40_000_000, classification: 'ACCUMULATION', whale_address: 'a1', timestamp: 't1' },
        { usd_value: 37_000_000, classification: 'DISTRIBUTION', whale_address: 'a2', timestamp: 't2' },
        { usd_value: 36_000_000, classification: 'DISTRIBUTION', whale_address: 'a3', timestamp: 't3' },
      ]),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.buy_count).toBe(1)
    expect(d.sell_count).toBe(2)
    expect(d.direction).toBe('down') // 40M buys - 73M sells
    expect(d.unique_whales).toBe(3)
  })

  it('honours the window arg (7d widens the cutoff vs 24h)', async () => {
    const sb = stubSupabase([{ usd_value: 1_000_000, classification: 'buy', whale_address: 'w1', timestamp: 't' }])
    await run({ ticker: 'ETH', window: '7d' }, sb, now)
    const cutoff = new Date(sb._calls.gte).getTime()
    const expected = now().getTime() - 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(cutoff - expected)).toBeLessThan(1000)
  })

  it('returns top_sells / top_buys with shortened addresses for "who were the biggest sellers?"', async () => {
    const r = await run(
      { ticker: 'WETH', window: '7d' },
      stubSupabase([
        { usd_value: 50_000_000, classification: 'sell', whale_address: '0xabcdef0123456789abcdef0123456789abcdef01', timestamp: 't1' },
        { usd_value: 30_000_000, classification: 'sell', whale_address: '0x1111111111111111111111111111111111111111', timestamp: 't2' },
        { usd_value: 10_000_000, classification: 'buy', whale_address: '0x2222222222222222222222222222222222222222', timestamp: 't3' },
      ]),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.top_sells).toHaveLength(2)
    expect(d.top_sells[0].usd_value).toBe(50_000_000)
    expect(d.top_sells[0].address_short).toBe('0xabcd…ef01')
    expect(d.top_buys).toHaveLength(1)
    expect(d.net_usd).toBe(10_000_000 - 80_000_000)
    expect(d.direction).toBe('down')
  })

  it('joins an entity label onto a top transaction when tracked_address_universe knows it', async () => {
    const r = await run(
      { ticker: 'BTC', window: '24h' },
      stubSupabase(
        [{ usd_value: 9_000_000, classification: 'DISTRIBUTION', whale_address: '0xbinance', timestamp: 't1' }],
        [{ address: '0xbinance', arkham_entity_name: 'Binance', arkham_entity_type: 'cex', arkham_label: null }]
      ),
      now
    )
    const d = r.data as any
    expect(d.top_sells[0].label).toBe('Binance')
    expect(d.top_sells[0].cohort).toBe('cex')
  })

  it('returns no_whale_transactions on an empty window', async () => {
    const r = await run({ ticker: 'BTC', window: '7d' }, stubSupabase([]), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_whale_transactions')
  })
})
