/**
 * Regression tests for the 2026-10-06 real-user ORCA audit (20 conversations,
 * 15 fail / 5 poor). Each case is a failure users actually saw.
 */
import { describe, it, expect } from 'vitest'
import { isNoiseRow } from '@/lib/orca/junk-addresses'
import { run as runTrending } from '@/lib/orca/orchestrator/tools/getTrendingWhales'
import { run as runWhaleFlows } from '@/lib/orca/orchestrator/tools/getWhaleFlows'
import { run as runPrice } from '@/lib/orca/orchestrator/tools/getPrice'
import { withAsOf } from '@/lib/orca/first-answer'
import { MOVE_WHY_RE, OUTLOOK_RE, isBareTickerAsk, wantsFocusedDataAnswer } from '@/lib/orca/route-dispatch'
import { matchFastPath } from '@/lib/orca/fast-paths'
import { FIRST_QUESTION } from '@/lib/onboarding/firstRun'

const MORPHO = '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
const now = () => new Date('2026-10-05T12:00:00Z')

/** Chain stub: every builder method returns the chain; awaiting it yields the table's rows. */
function stub(tables: Record<string, any[]>, rpc?: (fn: string, params: any) => any) {
  const from = (t: string) => {
    const result = { data: tables[t] ?? [], error: null }
    const chain: any = new Proxy(
      {},
      {
        get(_o, prop) {
          if (prop === 'then') return (res: any) => res(result)
          return () => chain
        },
      }
    )
    return chain
  }
  return { from, ...(rpc ? { rpc: async (fn: string, p: any) => ({ data: rpc(fn, p), error: null }) } : {}) } as any
}

/** Honours .range(from, to) and caps every request at 1,000 rows, like PostgREST. */
function pagedStub(rows: any[]) {
  const from = () => {
    let range: [number, number] | null = null
    const chain: any = new Proxy(
      {},
      {
        get(_o, prop) {
          if (prop === 'range') return (a: number, b: number) => { range = [a, b]; return chain }
          if (prop === 'then') {
            const [a, b] = range ?? [0, 999]
            return (res: any) => res({ data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null })
          }
          return () => chain
        },
      }
    )
    return chain
  }
  return { from } as any
}

describe('junk / flash-loan rows', () => {
  it('flags Morpho or the Balancer Vault on any side of a row, in any case', () => {
    expect(isNoiseRow({ whale_address: MORPHO })).toBe(true)
    expect(isNoiseRow({ whale_address: '0xbot', to_address: BALANCER_VAULT })).toBe(true)
    expect(isNoiseRow({ whale_address: '0xbot', from_address: MORPHO.toUpperCase() })).toBe(true)
    expect(isNoiseRow({ whale_address: '0xreal', from_address: '0xa', to_address: '0xb' })).toBe(false)
    expect(isNoiseRow(null)).toBe(false)
  })

  it('getTrendingWhales leaves flash-loan legs out of the first answer\'s totals', async () => {
    const rows = [
      // Morpho flash-loan legs written as WBTC BUYs: the "$1B of whale BTC buying"
      { token_symbol: 'WBTC', usd_value: 99_800_000, classification: 'BUY', whale_address: MORPHO, from_address: '0xbot', to_address: MORPHO },
      { token_symbol: 'WBTC', usd_value: 99_700_000, classification: 'BUY', whale_address: MORPHO, from_address: '0xbot', to_address: MORPHO },
      // real whale activity
      { token_symbol: 'WBTC', usd_value: 3_000_000, classification: 'BUY', whale_address: '0xw1', from_address: '0xx', to_address: '0xw1' },
      { token_symbol: 'WBTC', usd_value: 1_000_000, classification: 'SELL', whale_address: '0xw2', from_address: '0xw2', to_address: '0xy' },
      // Balancer flash-loan repayment written as a WETH SELL
      { token_symbol: 'WETH', usd_value: 59_000_000, classification: 'SELL', whale_address: '0xbot2', from_address: '0xbot2', to_address: BALANCER_VAULT },
      { token_symbol: 'WETH', usd_value: 400_000, classification: 'BUY', whale_address: '0xw3', from_address: '0xz', to_address: '0xw3' },
      { token_symbol: 'WETH', usd_value: 300_000, classification: 'SELL', whale_address: '0xw4', from_address: '0xw4', to_address: '0xq' },
    ]
    const r = await runTrending({ window: '24h' }, stub({ all_whale_transactions: rows }), now)
    expect(r.ok).toBe(true)
    const byTicker = Object.fromEntries((r.data as any).tokens.map((t: any) => [t.ticker, t]))
    expect(byTicker.BTC.buy_usd).toBe(3_000_000)
    expect(byTicker.BTC.net_usd).toBe(2_000_000)
    expect(byTicker.BTC.unique_whales).toBe(2)
    expect(byTicker.ETH.sell_usd).toBe(300_000)
    expect(byTicker.ETH.net_usd).toBe(100_000)
  })

  it('getTrendingWhales reads past the 1,000-row PostgREST cap', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({
      token_symbol: 'LINK', usd_value: 100_000, classification: i % 5 === 0 ? 'SELL' : 'BUY', whale_address: `0xwhale${i}`,
    }))
    const r = await runTrending({ window: '24h' }, pagedStub(rows), now)
    expect(r.ok).toBe(true)
    const link = (r.data as any).tokens[0]
    expect(link.unique_whales).toBe(2500)
    expect(link.buy_count + link.sell_count).toBe(2500)
  })

  it('getWhaleFlows takes the noise rows back out of the server-side totals', async () => {
    const rows = [
      { usd_value: 100_000_000, classification: 'BUY', whale_address: MORPHO, from_address: '0xbot', to_address: MORPHO },
      { usd_value: 2_000_000, classification: 'BUY', whale_address: '0xa', from_address: '0xm', to_address: '0xa' },
      { usd_value: 1_000_000, classification: 'SELL', whale_address: '0xb', from_address: '0xb', to_address: '0xn' },
      { usd_value: 5_000_000, classification: 'SELL', whale_address: '0xc', from_address: '0xc', to_address: BALANCER_VAULT },
    ]
    // The SQL function sums every row, flash loans included.
    const rpc = (fn: string) =>
      fn === 'ticker_flow_agg' ? [{ buy_usd: 102_000_000, sell_usd: 6_000_000, buy_count: 2, sell_count: 2, unique_whales: 4 }] : []
    const r = await runWhaleFlows({ ticker: 'LINK', window: '24h' }, stub({ all_whale_transactions: rows }, rpc), now)
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.buy_usd).toBe(2_000_000)
    expect(d.sell_usd).toBe(1_000_000)
    expect(d.net_usd).toBe(1_000_000)
    expect(d.buy_count).toBe(1)
    expect(d.sell_count).toBe(1)
    expect(d.unique_whales).toBe(2)
    expect(d.top_buys.map((t: any) => t.address)).toEqual(['0xa'])
  })
})

describe('getPrice units', () => {
  it('labels the % change and formats it, so FET -0.26% can no longer read as -26.1%', async () => {
    const r = await runPrice(
      { ticker: 'FET' },
      stub({ price_snapshots: [{ price_usd: 0.2296, price_change_24h: -0.261, price_change_7d: 5.24, timestamp: '2026-10-03T15:30:19Z' }] }),
      now
    )
    expect(r.ok).toBe(true)
    const d = r.data as any
    expect(d.change_24h_pct).toBe(-0.261)
    expect(d.change_24h_display).toBe('-0.26%')
    expect(d.change_7d_display).toBe('+5.2%')
    expect(d.change_1h_display).toBeNull()
    expect(d).not.toHaveProperty('change_24h')
  })
})

describe('first answer "as of" line', () => {
  const DISC = 'This output is an automated summary of public data for informational and educational purposes only.'
  const at = new Date('2026-10-05T11:30:20Z')

  it('goes before the disclaimer', () => {
    const out = withAsOf(`Whales sold ETH.\n\n${DISC}`, at)
    expect(out).toBe(`Whales sold ETH.\n\nAs of \`11:30 UTC\`.\n\n${DISC}`)
  })
  it('is not added twice', () => {
    const text = `Whales sold ETH. As of \`11:15 UTC\`.\n\n${DISC}`
    expect(withAsOf(text, at)).toBe(text)
  })
  it('is appended when there is no disclaimer', () => {
    expect(withAsOf('Whales sold ETH.', at)).toBe('Whales sold ETH.\n\nAs of `11:30 UTC`.')
  })
})

describe('routing of the audited messages', () => {
  it('"why btc falling" reaches the why-move path without an auxiliary verb', () => {
    expect(MOVE_WHY_RE.test('why btc falling')).toBe(true)
    expect(MOVE_WHY_RE.test('why is btc falling')).toBe(true)
    expect(MOVE_WHY_RE.test('why sol pumping today')).toBe(true)
    expect(MOVE_WHY_RE.test('why should I use sonar')).toBe(false)
    expect(matchFastPath('why btc falling', ['BTC'])?.name).toBe('why_move')
  })

  it('outlook asks leave the long note; explicit deep dives keep it', () => {
    expect(OUTLOOK_RE.test('Btc next move')).toBe(true)
    expect(wantsFocusedDataAnswer('Btc next move')).toBe(true)
    expect(wantsFocusedDataAnswer('what would be solana Major Trend about this october?')).toBe(true)
    expect(wantsFocusedDataAnswer('tell me about SOL this week')).toBe(false)
    expect(matchFastPath('Btc next move', ['BTC'])?.name).toBe('outlook')
    expect(matchFastPath('what would be solana Major Trend about this october?', ['SOL'])?.name).toBe('outlook')
  })

  it('a dated sentiment question keeps its sentiment answer', () => {
    expect(matchFastPath('Bitcoin sentiment for october month?', ['BTC'])?.name).toBe('social_ticker')
  })

  it('bare tickers and pairs get the compact snapshot', () => {
    for (const [msg, t] of [['Doge', 'DOGE'], ['PEPE', 'PEPE'], ['fet utsd', 'FET'], ['solusdt', 'SOL'], ['$sol', 'SOL'], ['bitcoin', 'BTC'], ['eth price now', 'ETH']]) {
      expect(isBareTickerAsk(msg, t)).toBe(true)
    }
    expect(matchFastPath('Doge', ['DOGE'])?.name).toBe('ticker_snapshot')
    expect(matchFastPath('Doge', ['DOGE'])?.calls.map((c) => c.tool)).toEqual(['getPrice', 'getSignalContext', 'getWhaleFlows', 'getNews'])
    expect(matchFastPath('fet utsd', ['FET'])?.name).toBe('ticker_snapshot')
  })

  it('anything more than a ticker is not a bare ask', () => {
    expect(isBareTickerAsk('deep dive DOGE', 'DOGE')).toBe(false)
    expect(isBareTickerAsk('tell me about BTC', 'BTC')).toBe(false)
    expect(isBareTickerAsk('Btc next move', 'BTC')).toBe(false)
    expect(isBareTickerAsk('Doge', null)).toBe(false)
  })

  it('the cached first question still matches its 24h whale summary', () => {
    const fp = matchFastPath(FIRST_QUESTION, [])
    expect(fp?.name).toBe('whale_summary')
    expect((fp?.calls[0].args as any).window).toBe('24h')
  })
})

// ── Review round (2026-10-06): fixes for the reviewers' confirmed findings ──
import { readAllRows } from '@/lib/orca/orchestrator/tools/pagedRead'
import { run as runConvergence } from '@/lib/orca/orchestrator/tools/getWhaleConvergence'
import { isOutlookAsk } from '@/lib/orca/route-dispatch'

describe('paged reads', () => {
  it('reads every page and drops a row that two pages both returned', async () => {
    const rows = Array.from({ length: 2300 }, (_, i) => ({ id: i, transaction_hash: `0x${i}` }))
    // Simulate unstable tie ordering: page 2 starts with the last row of page 1.
    let call = 0
    const query = () => {
      const n = call++
      const chain: any = new Proxy({}, {
        get(_o, prop) {
          if (prop === 'range') return (a: number, b: number) => ({
            then: (res: any) => res({ data: n === 1 ? [rows[999], ...rows.slice(1000, 1999)] : rows.slice(a, b + 1), error: null }),
          })
          return () => chain
        },
      })
      return chain
    }
    const r = await readAllRows(query, { maxRows: 40_000 })
    expect(r.complete).toBe(true)
    expect(new Set(r.data!.map((x: any) => x.id)).size).toBe(r.data!.length)
  })

  it('reports an incomplete read when maxRows is reached', async () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({ id: i }))
    const r = await readAllRows(() => pagedStub(rows).from(), { maxRows: 3000 })
    expect(r.complete).toBe(false)
    expect(r.data!.length).toBe(3000)
  })
})

describe('whale noise, review round', () => {
  it('getWhaleFlows treats a Morpho leg over $150M as noise, not an outlier, and keeps the exact totals', async () => {
    const rows = [
      { usd_value: 230_000_000, classification: 'BUY', whale_address: MORPHO, from_address: '0xbot', to_address: MORPHO },
      { usd_value: 2_000_000, classification: 'BUY', whale_address: '0xa', from_address: '0xm', to_address: '0xa' },
      { usd_value: 1_000_000, classification: 'SELL', whale_address: '0xb', from_address: '0xb', to_address: '0xn' },
    ]
    const rpc = (fn: string) =>
      fn === 'ticker_flow_agg' ? [{ buy_usd: 232_000_000, sell_usd: 1_000_000, buy_count: 2, sell_count: 1, unique_whales: 3 }] : []
    const r = await runWhaleFlows({ ticker: 'LINK', window: '7d' }, stub({ all_whale_transactions: rows }, rpc), now)
    const d = r.data as any
    expect(d.excluded_outliers).toBeUndefined()
    expect(d.buy_usd).toBe(2_000_000)
    expect(d.sell_usd).toBe(1_000_000)
    expect(d.unique_whales).toBe(2)
  })

  it('getWhaleConvergence ignores Balancer Vault legs, where the junk is the counterparty', async () => {
    const buy = (w: string, to = w) => ({ token_symbol: 'WETH', usd_value: 500_000, classification: 'BUY', whale_address: w, from_address: '0xpool', to_address: to, timestamp: '2026-10-05T10:00:00Z' })
    const rows = [buy('0xw1'), buy('0xw2'), buy('0xbot1', BALANCER_VAULT), buy('0xbot2', BALANCER_VAULT)]
    const r = await runConvergence({ window: '24h', min_whales: 3 }, stub({ all_whale_transactions: rows }), now)
    const eth = ((r.data as any)?.tokens ?? []).find((t: any) => t.ticker === 'ETH')
    expect(eth).toBeUndefined()
  })
})

describe('first answer "as of" line, short disclaimer', () => {
  it('goes before the short fallback disclaimer too', () => {
    const at = new Date('2026-10-05T11:30:20Z')
    const out = withAsOf('Whales sold ETH.\n\nNot financial advice. This is research-grade analysis only.', at)
    expect(out.endsWith('Not financial advice. This is research-grade analysis only.')).toBe(true)
    expect(out).toContain('As of `11:30 UTC`.')
  })
})

describe('routing, review round', () => {
  it('outlook covers next-move and trend asks only', () => {
    expect(isOutlookAsk('Btc next move')).toBe(true)
    expect(isOutlookAsk('what would be solana Major Trend about this october?')).toBe(true)
    expect(isOutlookAsk('is PEPE trending?')).toBe(false)
    expect(isOutlookAsk('BTC support levels')).toBe(false)
    expect(isOutlookAsk('how did SOL do in September?')).toBe(false)
    expect(isOutlookAsk('will BTC go up this month?')).toBe(false)
    expect(isOutlookAsk('https://www.coindesk.com/markets/bitcoin-price-outlook')).toBe(false)
  })

  it('perps and chart keep their own paths; non-Latin requests are not bare tickers', () => {
    expect(matchFastPath('BTC perps', ['BTC'])?.name).toBe('deriv_ticker')
    expect(matchFastPath('BTC chart', ['BTC'])?.name).not.toBe('ticker_snapshot')
    expect(isBareTickerAsk('帮我分析一下 BTC', 'BTC')).toBe(false)
  })

  it("a 'why' about the signal goes to the planner, which loads the signal", () => {
    expect(matchFastPath("why is SOL's signal down", ['SOL'])?.name).not.toBe('why_move')
  })
})
