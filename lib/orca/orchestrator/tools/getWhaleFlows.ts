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

const WHALE_FLAT_THRESHOLD_USD = 100_000
const ROW_LIMIT = 1000
const TOP_TX_COUNT = 5

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

  try {
    const { data } = await supabase
      .from('all_whale_transactions')
      .select('usd_value, classification, whale_address, timestamp')
      .eq('token_symbol', ticker)
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
    for (const row of data as Array<any>) {
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
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
        buy_usd: Math.round(buyUsd),
        sell_usd: Math.round(sellUsd),
        net_usd: Math.round(net),
        direction,
        buy_count: buys,
        sell_count: sells,
        unique_whales: whales.size,
        top_buys: topBuys.map(decorate),
        top_sells: topSells.map(decorate),
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
