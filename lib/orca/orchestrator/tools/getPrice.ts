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
    // price_snapshots stores changes in PERCENT (-0.261 = -0.26%). An
    // unlabelled change_24h was read by the writer as a fraction, so FET's
    // -0.26% went out as "-26.1%" (audit 2026-10-06). Name the unit and hand
    // the writer the display string.
    const ch1h = numericOrNull(row.price_change_1h)
    const ch24h = numericOrNull(row.price_change_24h)
    const ch7d = numericOrNull(row.price_change_7d)
    return {
      ok: true,
      data: {
        ticker,
        price_usd: row.price_usd,
        change_1h_pct: ch1h,
        change_24h_pct: ch24h,
        change_7d_pct: ch7d,
        change_1h_display: formatPct(ch1h),
        change_24h_display: formatPct(ch24h),
        change_7d_display: formatPct(ch7d),
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

/** A percent value as the user should read it: "-0.26%", "+5.2%". */
export function formatPct(v: number | null): string | null {
  if (v === null) return null
  const digits = Math.abs(v) < 1 ? 2 : 1
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`
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
