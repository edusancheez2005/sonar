/**
 * Tool: getPrice
 * =============================================================================
 * Reads the most recent row from `price_snapshots` for a ticker. Mirrors
 * the query shape used by lib/personal/watchlist.ts; intentionally kept
 * separate so this tool can evolve (e.g. multi-window, change %) without
 * touching the personal-dashboard data layer.
 */
import type { SupabaseLike, ToolResult } from '../types'

export interface GetPriceArgs {
  ticker?: unknown
}

export async function run(
  args: GetPriceArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return { ok: false, data: null, source: 'price_snapshots', fetched_at, error: 'invalid_ticker' }
  }

  try {
    const { data } = await supabase
      .from('price_snapshots')
      .select('price_usd, price_change_1h, price_change_24h, price_change_7d, volume_24h, market_cap, timestamp')
      .eq('ticker', ticker)
      .order('timestamp', { ascending: false })
      .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    if (!row || typeof row.price_usd !== 'number') {
      return { ok: false, data: null, source: 'price_snapshots', fetched_at, error: 'no_data' }
    }
    return {
      ok: true,
      data: {
        ticker,
        price_usd: row.price_usd,
        change_1h: numericOrNull(row.price_change_1h),
        change_24h: numericOrNull(row.price_change_24h),
        change_7d: numericOrNull(row.price_change_7d),
        volume_24h: numericOrNull(row.volume_24h),
        market_cap: numericOrNull(row.market_cap),
        as_of: row.timestamp ?? null,
      },
      source: 'price_snapshots',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'price_snapshots',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}

function numericOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
