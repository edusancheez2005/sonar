/**
 * Tool: getMostActiveWallets
 * =============================================================================
 * Market-wide wallet leaderboard. Answers "which wallet has the most
 * transactions today?" / "biggest / most active wallets right now" \u2014 questions
 * about wallet activity with no specific address.
 *
 * Aggregates `all_whale_transactions` over a window (default 24h), groups by
 * whale_address, and ranks by transaction count (tie-broken by total USD
 * volume). Per-address lookups still go through getWalletActivity.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { applyLabel, fetchEntityLabels } from './entityLabels'

const WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

type WindowKey = keyof typeof WINDOWS

const DEFAULT_WINDOW: WindowKey = '24h'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25
const ROW_LIMIT = 5000

export interface GetMostActiveWalletsArgs {
  window?: unknown
  limit?: unknown
}

interface Bucket {
  address: string
  tx_count: number
  total_usd: number
  buy_usd: number
  sell_usd: number
  tokens: Set<string>
}

export async function run(
  args: GetMostActiveWalletsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const window = normaliseWindow(args.window)
  const limit = clampLimit(args.limit)
  const sinceIso = new Date(now().getTime() - WINDOWS[window]).toISOString()

  try {
    const { data, error } = await supabase
      .from('all_whale_transactions')
      .select('whale_address, token_symbol, usd_value, classification, timestamp')
      .gte('timestamp', sinceIso)
      .order('timestamp', { ascending: false })
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
        error: 'no_wallet_activity',
      }
    }

    const buckets = new Map<string, Bucket>()
    for (const row of data as Array<any>) {
      const address = String(row?.whale_address ?? '').trim()
      if (!address) continue
      const v = Number(row?.usd_value)
      const usd = Number.isFinite(v) && v > 0 ? v : 0
      const c = String(row?.classification ?? '').toLowerCase()
      const ticker = String(row?.token_symbol ?? '').toUpperCase().trim()
      let b = buckets.get(address)
      if (!b) {
        b = { address, tx_count: 0, total_usd: 0, buy_usd: 0, sell_usd: 0, tokens: new Set() }
        buckets.set(address, b)
      }
      b.tx_count += 1
      b.total_usd += usd
      if (c.startsWith('buy') || c.startsWith('accum')) b.buy_usd += usd
      else if (c.startsWith('sell') || c.startsWith('distrib')) b.sell_usd += usd
      if (ticker) b.tokens.add(ticker)
    }

    const wallets = Array.from(buckets.values())
      .sort((a, b) => (b.tx_count - a.tx_count) || (b.total_usd - a.total_usd))
      .slice(0, limit)
      .map((b, i) => ({
        rank: i + 1,
        address: b.address,
        address_short: shortAddress(b.address),
        tx_count: b.tx_count,
        total_usd: Math.round(b.total_usd),
        buy_usd: Math.round(b.buy_usd),
        sell_usd: Math.round(b.sell_usd),
        net_usd: Math.round(b.buy_usd - b.sell_usd),
        tokens: Array.from(b.tokens).slice(0, 8),
      }))

    // §7 — join Arkham entity labels (label/cohort) onto the ranked wallets so
    // the renderer can show "Binance 14 (0x28C6…1d60)". Best-effort + flagged;
    // unlabelled wallets keep their bare address. Never fabricates a label.
    const labels = await fetchEntityLabels(supabase, wallets.map((w) => w.address))
    const labelledWallets = wallets.map((w) => applyLabel(w, labels))

    return {
      ok: true,
      data: { window, count: labelledWallets.length, wallets: labelledWallets },
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

function shortAddress(a: string): string {
  if (a.length <= 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
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
