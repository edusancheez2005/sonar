import { describe, it, expect } from 'vitest'
import {
  isCountedRow, foldTokenFlows, foldTokenFlowsWithStats, flowTone, chainsLiveLabel, computeTokenFlows,
  buildSnapshot, readCachedFlows, NET_FLOW_DEFINITION, MAX_SANE_TX_USD,
} from '@/lib/whale/netFlow'

const MORPHO = '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
const W = (n: number) => `0x${String(n).padStart(40, '0')}`

function row(o: Partial<Record<string, any>>) {
  return {
    id: o.id ?? Math.floor(Math.random() * 1e9),
    transaction_hash: o.transaction_hash ?? `0x${Math.random().toString(16).slice(2)}`,
    timestamp: o.timestamp ?? '2026-10-25T10:00:00Z',
    blockchain: o.blockchain ?? 'ethereum',
    token_symbol: o.token_symbol ?? 'LINK',
    classification: o.classification ?? 'BUY',
    usd_value: o.usd_value ?? 100_000,
    whale_address: o.whale_address ?? W(1),
    from_address: o.from_address ?? W(9),
    to_address: o.to_address ?? W(1),
    from_label: o.from_label ?? null,
    to_label: o.to_label ?? null,
  }
}

/** Honours .range(from, to) and caps every request at 1,000 rows, like PostgREST. */
function pagedStub(rows: any[]) {
  const from = () => {
    let range: [number, number] | null = null
    const chain: any = new Proxy({}, {
      get(_o, prop) {
        if (prop === 'range') return (a: number, b: number) => { range = [a, b]; return chain }
        if (prop === 'then') {
          const [a, b] = range ?? [0, 999]
          return (res: any) => res({ data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null })
        }
        return () => chain
      },
    })
    return chain
  }
  return { from } as any
}

/** Every builder call returns the chain; awaiting yields the table's rows. */
function tableStub(tables: Record<string, any>) {
  const from = (t: string) => {
    const result = { data: tables[t] ?? null, error: null }
    const chain: any = new Proxy({}, { get(_o, prop) { if (prop === 'then') return (res: any) => res(result); return () => chain } })
    return chain
  }
  return { from } as any
}

describe('isCountedRow', () => {
  it('drops protocol and flash-loan legs on any side, in any case', () => {
    expect(isCountedRow(row({ whale_address: MORPHO, token_symbol: 'WBTC', usd_value: 109_000_000 }))).toMatchObject({ ok: false, reason: 'junk' })
    expect(isCountedRow(row({ to_address: BALANCER_VAULT, token_symbol: 'WETH' }))).toMatchObject({ ok: false, reason: 'junk' })
  })
  it('drops exchange-internal moves, the $150M cap, stablecoins and bad symbols', () => {
    expect(isCountedRow(row({ from_label: 'Binance Hot Wallet 14', to_label: 'Binance Cold Wallet' }))).toMatchObject({ ok: false, reason: 'exchangeInternal' })
    expect(isCountedRow(row({ usd_value: MAX_SANE_TX_USD + 1 }))).toMatchObject({ ok: false, reason: 'overCap' })
    expect(isCountedRow(row({ token_symbol: 'USDT' }))).toMatchObject({ ok: false, reason: 'stablecoin' })
    expect(isCountedRow(row({ token_symbol: 'UNKNOWN_TOKEN' }))).toMatchObject({ ok: false, reason: 'badSymbol' })
    expect(isCountedRow(row({ usd_value: 0 }))).toMatchObject({ ok: false, reason: 'badSymbol' })
  })
  it('lets a per-ticker stablecoin read keep its rows', () => {
    expect(isCountedRow(row({ token_symbol: 'USDC' }), { allowStablecoins: true })).toMatchObject({ ok: true, symbol: 'USDC' })
  })
  it('folds wrapped symbols into the underlying asset', () => {
    expect(isCountedRow(row({ token_symbol: 'cbBTC' }))).toMatchObject({ ok: true, symbol: 'BTC' })
    expect(isCountedRow(row({ token_symbol: 'wstETH' }))).toMatchObject({ ok: true, symbol: 'ETH' })
  })
})

describe('foldTokenFlows', () => {
  const rows = [
    row({ token_symbol: 'WBTC', classification: 'BUY', usd_value: 2_000_000, whale_address: W(1) }),
    row({ token_symbol: 'CBBTC', classification: 'SELL', usd_value: 500_000, whale_address: W(2) }),
    row({ token_symbol: 'TBTC', classification: 'BUY', usd_value: 300_000, whale_address: W(1) }),
    row({ token_symbol: 'WETH', classification: 'SELL', usd_value: 1_000_000, whale_address: W(3) }),
    row({ token_symbol: 'STETH', classification: 'SELL', usd_value: 250_000, whale_address: W(4) }),
    row({ token_symbol: 'WBTC', classification: 'BUY', usd_value: 109_000_000, whale_address: MORPHO }),
    row({ token_symbol: 'USDT', classification: 'BUY', usd_value: 9_000_000 }),
  ]
  it('merges WBTC/cbBTC/tBTC under BTC and WETH/stETH under ETH', () => {
    const m = foldTokenFlows(rows)
    expect([...m.keys()].sort()).toEqual(['BTC', 'ETH'])
    expect(m.get('BTC')).toMatchObject({ buyUsd: 2_300_000, sellUsd: 500_000, netUsd: 1_800_000, buyCount: 2, sellCount: 1, uniqueWhales: 2, volumeUsd: 2_800_000 })
    expect(m.get('ETH')).toMatchObject({ netUsd: -1_250_000, sellCount: 2 })
  })
  it('reports what it excluded and why', () => {
    const r = foldTokenFlowsWithStats(rows)
    expect(r.excluded.junk).toEqual({ count: 1, usd: 109_000_000 })
    expect(r.excluded.stablecoin).toEqual({ count: 1, usd: 9_000_000 })
    expect(r.rowsRead).toBe(7)
    expect(r.rowsCounted).toBe(5)
    expect(r.tokens.get('BTC')?.excluded.junk).toBe(1)
  })
})

describe('flowTone', () => {
  it('is flat under $50K or under 5% of the volume', () => {
    expect(flowTone(49_000, 100_000)).toBe('flat')
    expect(flowTone(400_000, 10_000_000)).toBe('flat') // 4% of volume
    expect(flowTone(600_000, 10_000_000)).toBe('in')
    expect(flowTone(-600_000, 10_000_000)).toBe('out')
  })
})

describe('chainsLiveLabel and definition', () => {
  it('says Ethereum only when only Ethereum has rows', () => {
    expect(chainsLiveLabel(['ethereum'])).toBe('Ethereum only right now (WBTC/cbBTC counted as BTC)')
    expect(chainsLiveLabel(['bitcoin', 'ethereum'])).toBe('Chains: Bitcoin, Ethereum')
    expect(chainsLiveLabel([])).toBe('No whale rows in this window')
  })
  it('keeps the chain statement out of the definition', () => {
    expect(NET_FLOW_DEFINITION).toMatch(/Morpho Blue/)
    expect(NET_FLOW_DEFINITION).not.toMatch(/Ethereum only/)
  })
})

describe('computeTokenFlows', () => {
  it('reads past the 1,000-row cap', async () => {
    const rows = Array.from({ length: 2_500 }, (_, i) => row({ id: i + 1, usd_value: 3_000_000 - i, classification: i % 2 ? 'SELL' : 'BUY', whale_address: W(i) }))
    const snap = await computeTokenFlows(pagedStub(rows), { window: '24h', fresh: true, now: new Date('2026-10-25T12:00:00Z') })
    expect(snap.rows_read).toBe(2_500)
    expect(snap.rows_counted).toBe(2_500)
    expect(snap.chains_live).toEqual(['ethereum'])
    expect(snap.series).toHaveLength(24)
    expect(snap.top_txs?.[0].usd).toBe(3_000_000)
    expect(snap.definition).toBe(NET_FLOW_DEFINITION)
  })
  it('serves a fresh cache row instead of reading the tape', async () => {
    const generated_at = new Date(Date.now() - 60_000).toISOString()
    const supa = tableStub({ app_cache: { value: { window: '24h', generated_at, tokens: [], rows_counted: 7 }, updated_at: generated_at } })
    const snap = await computeTokenFlows(supa, { window: '24h' })
    expect(snap.cached).toBe(true)
    expect(snap.rows_counted).toBe(7)
  })
  it('ignores a stale cache row', async () => {
    const old = new Date(Date.now() - 60 * 60_000).toISOString()
    expect(await readCachedFlows(tableStub({ app_cache: { value: { generated_at: old }, updated_at: old } }), '24h')).toBeNull()
  })
})

describe('buildSnapshot', () => {
  it('buckets the 24h series by UTC hour and sorts tokens by |net|', () => {
    const snap = buildSnapshot([
      row({ token_symbol: 'LINK', usd_value: 200_000, timestamp: '2026-10-25T11:30:00Z' }),
      row({ token_symbol: 'FET', usd_value: 900_000, classification: 'SELL', timestamp: '2026-10-25T02:10:00Z' }),
    ], { window: '24h', sinceIso: '2026-10-24T12:00:00Z', untilIso: '2026-10-25T12:00:00Z', complete: true })
    expect(snap.tokens.map((t) => t.symbol)).toEqual(['FET', 'LINK'])
    expect(snap.series?.[23]).toMatchObject({ label: '11:00', count: 1, volumeUsd: 200_000 })
    expect(snap.totals.netUsd).toBe(-700_000)
  })
})
