/**
 * Tool: getWhaleConvergence
 * =============================================================================
 * "Which tokens are several whales buying at the same time?" — the question
 * Eduardo asked ORCA on 2026-10-01 ("tell me when 3+ tracked whales buy the
 * same token"). Groups the whale feed by token over a window and counts
 * DISTINCT buying wallets, so a token one whale bought ten times does not
 * outrank a token three different whales piled into.
 *
 * Source: all_whale_transactions (Sonar's labelled whale feed = the tracked
 * whales). Sells are reported alongside so the writer can say "3 bought, 1
 * sold". Junk/vanity contracts are excluded like the other whale tools.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'
import { isNonTradeRow } from '@/lib/orca/junk-addresses'
import { readAllRows } from './pagedRead'
import { applyLabel, fetchEntityLabels } from './entityLabels'

const WINDOWS = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
} as const
type WindowKey = keyof typeof WINDOWS
const MAX_SANE_TX_USD = 150_000_000
// .limit(6000) silently returned 1,000 rows (PostgREST cap), so distinct
// buyer counts came from the top 1,000 transfers (audit review 2026-10-06:
// SOL had 299 buyers over 7d, the tool saw 18). Read the whole window.
const ROW_LIMIT = 40_000
const MIN_TX_USD = 25_000

export interface GetWhaleConvergenceArgs {
  window?: unknown
  min_whales?: unknown
  limit?: unknown
}

interface Bucket {
  ticker: string
  buyers: Map<string, number>   // address → usd bought
  sellers: Map<string, number>
  buy_usd: number
  sell_usd: number
  buy_count: number
  sell_count: number
  last_ts: string
}

function normaliseWindow(raw: unknown): WindowKey {
  const w = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return (w in WINDOWS ? w : '24h') as WindowKey
}

export async function run(
  args: GetWhaleConvergenceArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const window = normaliseWindow(args.window)
  const minWhales = Math.min(20, Math.max(2, Math.round(Number(args.min_whales)) || 3))
  const limit = Math.min(15, Math.max(1, Math.round(Number(args.limit)) || 8))
  const sinceIso = new Date(now().getTime() - WINDOWS[window]).toISOString()

  try {
    const { data, error } = await readAllRows(
      () =>
        (supabase as any)
          .from('all_whale_transactions')
          .select('id, transaction_hash, token_symbol, usd_value, classification, whale_address, from_address, to_address, from_label, to_label, timestamp')
          .gte('timestamp', sinceIso)
          .gte('usd_value', MIN_TX_USD)
          .order('usd_value', { ascending: false })
          .order('id', { ascending: true }),
      { maxRows: ROW_LIMIT }
    )
    if (error) {
      return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: `query_failed: ${error.message || 'unknown'}` }
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: 'no_whale_transactions' }
    }

    const buckets = new Map<string, Bucket>()
    for (const row of data as Array<any>) {
      const ticker = canonicalSymbol(String(row?.token_symbol ?? '').trim()) ?? ''
      if (!ticker || !/^[A-Z0-9._-]{1,12}$/.test(ticker)) continue
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0 || v > MAX_SANE_TX_USD) continue
      const addr = String(row?.whale_address || '').trim()
      // Junk on any side (the Balancer Vault is the counterparty, not the
      // whale) or an exchange moving coins between its own wallets.
      if (!addr || isNonTradeRow(row)) continue
      const c = String(row?.classification ?? '').toLowerCase()
      let b = buckets.get(ticker)
      if (!b) {
        b = { ticker, buyers: new Map(), sellers: new Map(), buy_usd: 0, sell_usd: 0, buy_count: 0, sell_count: 0, last_ts: String(row?.timestamp || '') }
        buckets.set(ticker, b)
      }
      if (String(row?.timestamp || '') > b.last_ts) b.last_ts = String(row?.timestamp || '')
      if (c.startsWith('buy')) {
        b.buyers.set(addr, (b.buyers.get(addr) || 0) + v); b.buy_usd += v; b.buy_count += 1
      } else if (c.startsWith('sell')) {
        b.sellers.set(addr, (b.sellers.get(addr) || 0) + v); b.sell_usd += v; b.sell_count += 1
      }
    }

    const ranked = Array.from(buckets.values())
      .filter((b) => b.buyers.size >= minWhales)
      .sort((a, b) => b.buyers.size - a.buyers.size || b.buy_usd - a.buy_usd)
      .slice(0, limit)

    if (ranked.length === 0) {
      // Report the closest misses so the writer can say "the most crowded buy
      // was X with 2 whales" instead of a flat "nothing".
      const nearest = Array.from(buckets.values())
        .filter((b) => b.buyers.size > 0)
        .sort((a, b) => b.buyers.size - a.buyers.size || b.buy_usd - a.buy_usd)
        .slice(0, 3)
        .map((b) => ({ ticker: b.ticker, distinct_buyers: b.buyers.size, buy_usd: Math.round(b.buy_usd) }))
      return {
        ok: true,
        data: { window, min_whales: minWhales, tokens: [], nearest_misses: nearest, note: `No token had ${minWhales}+ distinct whale buyers in the last ${window}.` },
        source: 'all_whale_transactions',
        fetched_at,
      }
    }

    // Label the top buyers (best effort, same helper as the other whale tools).
    const topAddrs = Array.from(new Set(ranked.flatMap((b) => Array.from(b.buyers.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([a]) => a)))).slice(0, 30)
    let labels: Map<string, any> = new Map()
    try { labels = await fetchEntityLabels(supabase as any, topAddrs) } catch { /* labels are garnish */ }

    const tokens = ranked.map((b) => {
      const topBuyers = Array.from(b.buyers.entries())
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([address, usd]) => applyLabel({ address, bought_usd: Math.round(usd) }, labels))
      return {
        ticker: b.ticker,
        distinct_buyers: b.buyers.size,
        distinct_sellers: b.sellers.size,
        buy_usd: Math.round(b.buy_usd),
        sell_usd: Math.round(b.sell_usd),
        net_usd: Math.round(b.buy_usd - b.sell_usd),
        buy_count: b.buy_count,
        sell_count: b.sell_count,
        last_buy_at: b.last_ts,
        top_buyers: topBuyers,
      }
    })

    return {
      ok: true,
      data: { window, min_whales: minWhales, tokens, scanned_rows: data.length },
      source: 'all_whale_transactions',
      fetched_at,
    }
  } catch (err: any) {
    return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: `exception: ${err?.message ?? 'unknown'}` }
  }
}
