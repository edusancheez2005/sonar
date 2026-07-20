/**
 * Tool: getWhaleFlows
 * =============================================================================
 * Aggregates buy / sell USD volume from `all_whale_transactions` for a single
 * ticker over a window (24h | 7d | 30d, default 24h) and returns net flow +
 * direction PLUS the top individual buy/sell transactions (with entity labels
 * when known) so "who were the biggest sellers of X?" can be answered with real
 * on-chain wallets instead of just aggregate counts.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { applyLabel, fetchEntityLabels } from './entityLabels'
import { symbolVariants } from '@/lib/wallet/symbol-aliases'

const WHALE_FLAT_THRESHOLD_USD = 100_000
const ROW_LIMIT = 1000
const TOP_TX_COUNT = 5

// Single-transfer sanity cap. Rows above this are protocol/router-scale moves
// (2026-07-19 audit: one vanity contract received ~$308M WBTC hourly, all
// classified BUY — $5B+/day of fake "whale accumulation"), not a whale trading.
// They are excluded from top-tx lists and from the JS aggregate sums, and the
// response carries `excluded_outliers` so the writer can mention the exclusion.
const MAX_SANE_TX_USD = 150_000_000

const WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

type WindowKey = keyof typeof WINDOWS

export interface GetWhaleFlowsArgs {
  ticker?: unknown
  window?: unknown
}

function normaliseWindow(raw: unknown): WindowKey {
  if (typeof raw === 'string') {
    const w = raw.trim().toLowerCase()
    if (w === '24h' || w === '7d' || w === '30d') return w
    if (/\b(today|day|1d)\b/.test(w)) return '24h'
    if (/\b(week|7)\b/.test(w)) return '7d'
    if (/\b(month|30)\b/.test(w)) return '30d'
  }
  return '24h'
}

function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export async function run(
  args: GetWhaleFlowsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: 'invalid_ticker' }
  }

  const window = normaliseWindow(args.window)
  const sinceIso = new Date(now().getTime() - WINDOWS[window]).toISOString()

  // ETH/BTC/SOL exposure is stored under wrapped symbols (WETH, WBTC, MSOL…)
  // — there are zero literal ETH/BTC rows — so query every variant.
  const variants = symbolVariants(ticker)
  const symbols = variants.length > 0 ? variants : [ticker]

  try {
    const base = supabase
      .from('all_whale_transactions')
      .select('usd_value, classification, whale_address, timestamp')
    // (.in falls back to .eq when unavailable, e.g. in test stubs.)
    const filtered =
      typeof base.in === 'function' && symbols.length > 1
        ? base.in('token_symbol', symbols)
        : base.eq('token_symbol', symbols[0])
    const { data } = await filtered
      .gte('timestamp', sinceIso)
      .order('usd_value', { ascending: false })
      .limit(ROW_LIMIT)

    if (!Array.isArray(data) || data.length === 0) {
      return {
        ok: false,
        data: null,
        source: 'all_whale_transactions',
        fetched_at,
        error: window === '24h' ? 'no_whale_transactions_24h' : 'no_whale_transactions',
      }
    }

    let buyUsd = 0
    let sellUsd = 0
    let buys = 0
    let sells = 0
    const whales = new Set<string>()
    const topBuys: Array<{ usd_value: number; address: string | null; timestamp: string | null }> = []
    const topSells: Array<{ usd_value: number; address: string | null; timestamp: string | null }> = []
    let excludedOutliers = 0
    let excludedOutlierUsd = 0
    for (const row of data as Array<any>) {
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      if (v > MAX_SANE_TX_USD) {
        excludedOutliers += 1
        excludedOutlierUsd += v
        continue
      }
      const c = String(row?.classification ?? '').toLowerCase()
      const addr = row?.whale_address ? String(row.whale_address) : null
      if (addr) whales.add(addr)
      const isBuy = c.startsWith('buy') || c.startsWith('accum')
      const isSell = c.startsWith('sell') || c.startsWith('distrib')
      if (isBuy) {
        buyUsd += v
        buys += 1
        if (topBuys.length < TOP_TX_COUNT) topBuys.push({ usd_value: Math.round(v), address: addr, timestamp: row?.timestamp ?? null })
      } else if (isSell) {
        sellUsd += v
        sells += 1
        if (topSells.length < TOP_TX_COUNT) topSells.push({ usd_value: Math.round(v), address: addr, timestamp: row?.timestamp ?? null })
      }
    }

    // The row scan above (capped at 1,000 by PostgREST, ordered by value) is
    // used only for the top individual buy/sell transactions — those are always
    // the highest-value rows, so the cap doesn't affect them. The AGGREGATE
    // totals must be exact, so override them with a server-side sum when the RPC
    // is available. Falls back to the (capped) JS sums otherwise.
    let uniqueWhales = whales.size
    // The RPC has no outlier filter, so when protocol-scale rows were excluded
    // above we keep the filtered JS sums instead — exact totals that include
    // $300M router shuffles are worse than capped totals that don't.
    if (typeof supabase.rpc === 'function' && excludedOutliers === 0) {
      try {
        // One RPC per symbol variant (the SQL function takes a single symbol);
        // unique_whales is summed across variants, which can double-count a
        // whale holding two wrappers — rare enough to accept.
        let rBuyUsd = 0, rSellUsd = 0, rBuys = 0, rSells = 0, rWhales = 0
        let rpcHit = false
        for (const sym of symbols) {
          const { data: aggRows, error: rpcErr } = await supabase.rpc('ticker_flow_agg', {
            p_symbol: sym,
            p_since: sinceIso,
          })
          const agg = Array.isArray(aggRows) ? aggRows[0] : aggRows
          if (!rpcErr && agg) {
            rpcHit = true
            rBuyUsd += Number(agg.buy_usd) || 0
            rSellUsd += Number(agg.sell_usd) || 0
            rBuys += Number(agg.buy_count) || 0
            rSells += Number(agg.sell_count) || 0
            rWhales += Number(agg.unique_whales) || 0
          }
        }
        if (rpcHit) {
          buyUsd = rBuyUsd
          sellUsd = rSellUsd
          buys = rBuys
          sells = rSells
          uniqueWhales = rWhales
        }
      } catch {
        // keep the JS-computed (capped) sums
      }
    }

    const net = buyUsd - sellUsd
    if (buys === 0 && sells === 0) {
      return {
        ok: false,
        data: null,
        source: 'all_whale_transactions',
        fetched_at,
        error: window === '24h' ? 'no_whale_transactions_24h' : 'no_whale_transactions',
      }
    }
    const direction =
      net > WHALE_FLAT_THRESHOLD_USD ? 'up' : net < -WHALE_FLAT_THRESHOLD_USD ? 'down' : 'flat'

    // §7 — label the top buy/sell wallets so the renderer can show
    // "Binance (0x28C6…1d60)" instead of a bare address. Best-effort + flagged.
    const labels = await fetchEntityLabels(
      supabase,
      [...topBuys, ...topSells].map((t) => t.address)
    )
    const decorate = (t: { usd_value: number; address: string | null; timestamp: string | null }) => {
      const base = {
        usd_value: t.usd_value,
        address: t.address,
        address_short: t.address ? shortAddress(t.address) : null,
        timestamp: t.timestamp,
      }
      return t.address ? applyLabel(base as typeof base & { address: string }, labels) : base
    }

    return {
      ok: true,
      data: {
        ticker,
        window,
        symbols_queried: symbols,
        buy_usd: Math.round(buyUsd),
        sell_usd: Math.round(sellUsd),
        net_usd: Math.round(net),
        direction,
        buy_count: buys,
        sell_count: sells,
        unique_whales: uniqueWhales,
        top_buys: topBuys.map(decorate),
        top_sells: topSells.map(decorate),
        ...(excludedOutliers > 0
          ? {
              excluded_outliers: {
                count: excludedOutliers,
                total_usd: Math.round(excludedOutlierUsd),
                reason: `single transfers above $${MAX_SANE_TX_USD / 1e6}M are protocol/exchange-internal scale and are excluded from flow totals`,
              },
            }
          : {}),
      },
      source: 'all_whale_transactions',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'all_whale_transactions',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function emptyFlow(ticker: string) {
  // Retained for callers/tests that still reference it; the live `run()`
  // path now returns ok:false on zero rows so the renderer prints the
  // "On-chain whale data not available" fallback instead of "$0.00 net flow".
  return {
    ticker,
    window: '24h',
    buy_usd: 0,
    sell_usd: 0,
    net_usd: 0,
    direction: 'flat' as const,
    buy_count: 0,
    sell_count: 0,
    unique_whales: 0,
  }
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}
