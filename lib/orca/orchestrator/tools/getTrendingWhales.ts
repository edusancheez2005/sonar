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
import { foldTokenFlows } from '@/lib/whale/netFlow'
import { readAllRows } from './pagedRead'

const WINDOWS = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

type WindowKey = keyof typeof WINDOWS

const DEFAULT_WINDOW: WindowKey = '7d'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25
// PostgREST returns at most 1,000 rows per request: .limit(4000) silently got
// 1,000 of 4,584 rows, so the whale counts were wrong (audit 2026-10-06).
// The whole window is read in pages; 40,000 covers a busy 7 days (~33,000).
// Longer windows are cut at the biggest 40,000 rows and say so.
const ROW_LIMIT = 40_000
const MIN_NET_USD = 50_000

export interface GetTrendingWhalesArgs {
  chain?: unknown
  window?: unknown
  limit?: unknown
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
    // Optional chain filter (coverage audit 2026-09-23: "solana whales only").
    const chainForms: Record<string, string[]> = {
      ethereum: ['ethereum', 'eth'], solana: ['solana', 'sol'], bsc: ['bsc', 'bnb'], polygon: ['polygon', 'matic'], bitcoin: ['bitcoin', 'btc'],
    }
    const chainArg = typeof args.chain === 'string' ? args.chain.trim().toLowerCase() : ''
    const chainKey = Object.keys(chainForms).find((k) => k === chainArg || chainForms[k].includes(chainArg)) ?? null
    const query = () => {
      let q: any = supabase
        .from('all_whale_transactions')
        .select('id, transaction_hash, token_symbol, usd_value, classification, whale_address, from_address, to_address, from_label, to_label, timestamp')
        .gte('timestamp', sinceIso)
        .order('usd_value', { ascending: false })
        .order('id', { ascending: true })
      if (chainKey && typeof q.in === 'function') q = q.in('blockchain', chainForms[chainKey])
      return q
    }
    const { data, error, complete } = await readAllRows(query, { maxRows: ROW_LIMIT })

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

    // The shared net-flow definition (lib/whale/netFlow.ts): wrapped variants
    // fold into the underlying asset; flash-loan legs, exchange-internal moves,
    // transfers above $150M and stablecoins are excluded.
    const tokens = [...foldTokenFlows(data as Array<any>).values()]
      .map((t) => ({
        ticker: t.symbol,
        buy_usd: t.buyUsd,
        sell_usd: t.sellUsd,
        net_usd: t.netUsd,
        abs_net_usd: Math.abs(t.netUsd),
        direction: t.netUsd > 0 ? 'up' : t.netUsd < 0 ? 'down' : 'flat',
        buy_count: t.buyCount,
        sell_count: t.sellCount,
        unique_whales: t.uniqueWhales,
      }))
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
        rows_scanned: data.length,
        // false: only the biggest ROW_LIMIT transfers were read, so counts
        // and totals cover those, not the whole window.
        complete,
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
