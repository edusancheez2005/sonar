/**
 * Tool: getTrendingWhales
 * =============================================================================
 * Market-wide whale-flow leaderboard. Answers "top whale moves this week" /
 * "biggest whale activity right now" — questions with no specific ticker.
 *
 * Aggregates `all_whale_transactions` over a window (default 7d), groups by
 * token_symbol, computes buy/sell USD totals + net flow + unique whales, and
 * returns the top N tokens ranked by absolute net flow magnitude.
 *
 * Per-ticker whale lookups still go through getWhaleFlows.
 */
import type { SupabaseLike, ToolResult } from '../types'

const WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

type WindowKey = keyof typeof WINDOWS

const DEFAULT_WINDOW: WindowKey = '7d'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25
const ROW_LIMIT = 4000
const MIN_NET_USD = 50_000

export interface GetTrendingWhalesArgs {
  window?: unknown
  limit?: unknown
}

interface Bucket {
  ticker: string
  buy_usd: number
  sell_usd: number
  buy_count: number
  sell_count: number
  whales: Set<string>
}

export async function run(
  args: GetTrendingWhalesArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const window = normaliseWindow(args.window)
  const limit = clampLimit(args.limit)
  const sinceMs = WINDOWS[window]
  const sinceIso = new Date(now().getTime() - sinceMs).toISOString()

  try {
    const { data, error } = await supabase
      .from('all_whale_transactions')
      .select('token_symbol, usd_value, classification, whale_address, timestamp')
      .gte('timestamp', sinceIso)
      .order('usd_value', { ascending: false })
      .limit(ROW_LIMIT)

    if (error) {
      return {
        ok: false,
        data: null,
        source: 'all_whale_transactions',
        fetched_at,
        error: `query_failed: ${error.message || 'unknown'}`,
      }
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        ok: false,
        data: null,
        source: 'all_whale_transactions',
        fetched_at,
        error: 'no_whale_transactions',
      }
    }

    const buckets = new Map<string, Bucket>()
    for (const row of data as Array<any>) {
      const ticker = String(row?.token_symbol ?? '').toUpperCase().trim()
      if (!ticker || !/^[A-Z0-9._-]{1,12}$/.test(ticker)) continue
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      const c = String(row?.classification ?? '').toLowerCase()
      let b = buckets.get(ticker)
      if (!b) {
        b = { ticker, buy_usd: 0, sell_usd: 0, buy_count: 0, sell_count: 0, whales: new Set() }
        buckets.set(ticker, b)
      }
      if (row?.whale_address) b.whales.add(String(row.whale_address))
      if (c.startsWith('buy')) {
        b.buy_usd += v
        b.buy_count += 1
      } else if (c.startsWith('sell')) {
        b.sell_usd += v
        b.sell_count += 1
      }
    }

    const tokens = Array.from(buckets.values())
      .map((b) => {
        const net = b.buy_usd - b.sell_usd
        return {
          ticker: b.ticker,
          buy_usd: Math.round(b.buy_usd),
          sell_usd: Math.round(b.sell_usd),
          net_usd: Math.round(net),
          abs_net_usd: Math.round(Math.abs(net)),
          direction: net > 0 ? 'up' : net < 0 ? 'down' : 'flat',
          buy_count: b.buy_count,
          sell_count: b.sell_count,
          unique_whales: b.whales.size,
        }
      })
      .filter((t) => t.abs_net_usd >= MIN_NET_USD && t.buy_count + t.sell_count >= 2)
      .sort((a, b) => b.abs_net_usd - a.abs_net_usd)
      .slice(0, limit)

    if (tokens.length === 0) {
      return {
        ok: false,
        data: null,
        source: 'all_whale_transactions',
        fetched_at,
        error: 'no_significant_whale_flows',
      }
    }

    return {
      ok: true,
      data: {
        window,
        count: tokens.length,
        tokens,
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

function normaliseWindow(raw: unknown): WindowKey {
  if (typeof raw !== 'string') return DEFAULT_WINDOW
  const s = raw.trim().toLowerCase()
  if (s in WINDOWS) return s as WindowKey
  if (/^(this )?(week|7d|7 days?)$/.test(s)) return '7d'
  if (/^(today|24h|day|1d)$/.test(s)) return '24h'
  if (/^(month|30d|30 days?)$/.test(s)) return '30d'
  return DEFAULT_WINDOW
}

function clampLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT)
}
