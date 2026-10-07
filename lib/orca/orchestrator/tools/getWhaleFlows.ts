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
import { isExchangeInternalRow, isNoiseRow } from '../../junk-addresses'
import { readAllRows } from './pagedRead'
import { symbolVariants } from '@/lib/wallet/symbol-aliases'

const WHALE_FLAT_THRESHOLD_USD = 100_000
// The whole window up to this many rows (a busy 30d ticker is ~14k).
const ROW_LIMIT = 40_000
const TOP_TX_COUNT = 5

// Single-transfer sanity cap. Rows above this are protocol/router-scale moves
// (2026-07-19 audit: one vanity contract received ~$308M WBTC hourly, all
// classified BUY — $5B+/day of fake "whale accumulation"), not a whale trading.
// They are excluded from top-tx lists and from the JS aggregate sums, and the
// response carries `excluded_outliers` so the writer can mention the exclusion.
const MAX_SANE_TX_USD = 150_000_000

const WINDOWS = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
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
    if (w === '1h' || w === '4h' || w === '24h' || w === '7d' || w === '30d') return w
    if (/^(last |past )?(hour|1 ?h(our)?)$/.test(w)) return '1h'
    if (/^(last |past )?(4|four) ?h(ours?)?$/.test(w)) return '4h'
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
    // Every row in the window, filtered here (audit 2026-10-06). This replaced
    // a 1,000-row scan plus the ticker_flow_agg RPC, which sums every row with
    // no filter, so flash-loan legs and exchange-internal moves came back into
    // the totals however the scan was patched.
    const query = () => {
      const base: any = supabase
        .from('all_whale_transactions')
        .select('id, transaction_hash, usd_value, classification, whale_address, from_address, to_address, from_label, to_label, timestamp')
      // (.in falls back to .eq when unavailable, e.g. in test stubs.)
      const filtered =
        typeof base.in === 'function' && symbols.length > 1
          ? base.in('token_symbol', symbols)
          : base.eq('token_symbol', symbols[0])
      return filtered
        .gte('timestamp', sinceIso)
        .order('usd_value', { ascending: false })
        .order('id', { ascending: true })
    }
    const { data, complete } = await readAllRows(query, { maxRows: ROW_LIMIT })

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
    let excludedInternal = 0
    let excludedInternalUsd = 0
    // Newest whale row seen. The Solana feed stopped on 3 Oct and a 7d SOL
    // answer still read as current (re-judge 2026-10-06); the writer flags it.
    let latestMs = -Infinity
    for (const row of data as Array<any>) {
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      // 2026-09-22 battery: the junk contract filled every "biggest buyer"
      // slot; 2026-10-06 audit: Balancer Vault flash-loan repayments read as
      // ETH selling. Junk on any side is not a whale trade, whatever its size.
      if (isNoiseRow(row)) continue
      // An exchange moving coins between its own wallets is not a trade.
      if (isExchangeInternalRow(row)) {
        excludedInternal += 1
        excludedInternalUsd += v
        continue
      }
      if (v > MAX_SANE_TX_USD) {
        excludedOutliers += 1
        excludedOutlierUsd += v
        continue
      }
      const c = String(row?.classification ?? '').toLowerCase()
      const addr = row?.whale_address ? String(row.whale_address) : null
      const isBuy = c.startsWith('buy') || c.startsWith('accum')
      const isSell = c.startsWith('sell') || c.startsWith('distrib')
      if (addr) whales.add(addr)
      const ts = Date.parse(String(row?.timestamp ?? ''))
      if (Number.isFinite(ts) && ts > latestMs) latestMs = ts
      // One entry per wallet in the "biggest buyers/sellers" lists — the rows
      // arrive ordered by value, so the first hit per address is its largest.
      const seenBuy = new Set(topBuys.map((t) => t.address))
      const seenSell = new Set(topSells.map((t) => t.address))
      if (isBuy) {
        buyUsd += v
        buys += 1
        if (topBuys.length < TOP_TX_COUNT && !(addr && seenBuy.has(addr))) topBuys.push({ usd_value: Math.round(v), address: addr, timestamp: row?.timestamp ?? null })
      } else if (isSell) {
        sellUsd += v
        sells += 1
        if (topSells.length < TOP_TX_COUNT && !(addr && seenSell.has(addr))) topSells.push({ usd_value: Math.round(v), address: addr, timestamp: row?.timestamp ?? null })
      }
    }
    const uniqueWhales = whales.size

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
        latest_at: Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null,
        top_buys: topBuys.map(decorate),
        top_sells: topSells.map(decorate),
        // false: only the biggest ROW_LIMIT rows were read.
        complete,
        ...(excludedInternal > 0
          ? { excluded_exchange_internal: { count: excludedInternal, total_usd: Math.round(excludedInternalUsd) } }
          : {}),
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
