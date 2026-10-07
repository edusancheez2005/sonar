/**
 * Tool: getPrice
 * =============================================================================
 * Reads the most recent row from `price_snapshots` for a ticker. Mirrors
 * the query shape used by lib/personal/watchlist.ts; intentionally kept
 * separate so this tool can evolve (e.g. multi-window, change %) without
 * touching the personal-dashboard data layer.
 */
import { readMarketVolume } from '@/lib/orca/marketVolume'
import type { SupabaseLike, ToolResult } from '../types'

export interface GetPriceArgs {
  ticker?: unknown
}

export interface LiveTicker {
  price: number
  changePct: number | null
  quoteVolume: number | null
}

/**
 * Live 24h ticker for a coin Sonar doesn't store. The price cron fetches every
 * Binance USDT pair but keeps only the tracked list, so "movrusdt" got "No
 * live price data right now" while MOVR traded normally (audit 2026-10-06).
 * One request, 4s cap; null on any failure.
 */
export async function binanceLiveTicker(symbol: string): Promise<LiveTicker | null> {
  try {
    const r = await fetch(
      `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}USDT`,
      { signal: AbortSignal.timeout(4000), cache: 'no-store' } as RequestInit
    )
    if (!r.ok) return null
    const t: any = await r.json()
    const price = Number(t?.lastPrice)
    if (!Number.isFinite(price) || price <= 0) return null
    const ch = Number(t?.priceChangePercent)
    const qv = Number(t?.quoteVolume)
    return { price, changePct: Number.isFinite(ch) ? ch : null, quoteVolume: Number.isFinite(qv) ? qv : null }
  } catch {
    return null
  }
}

export async function run(
  args: GetPriceArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date(),
  liveTicker: (symbol: string) => Promise<LiveTicker | null> = binanceLiveTicker
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
      const live = await liveTicker(ticker)
      if (!live) return { ok: false, data: null, source: 'price_snapshots', fetched_at, error: 'no_data' }
      return {
        ok: true,
        data: {
          ticker,
          tracked: false,
          price_usd: live.price,
          change_1h_pct: null,
          change_24h_pct: live.changePct,
          change_7d_pct: null,
          change_1h_display: null,
          change_24h_display: formatPct(live.changePct),
          change_7d_display: null,
          volume_24h: live.quoteVolume,
          volume_scope: 'Binance spot pair only',
          market_cap: null,
          as_of: fetched_at,
        },
        source: 'binance_live',
        fetched_at,
      }
    }
    // Market-wide 24h volume when the cron has it; the snapshot's figure is
    // one Binance pair (audit 2026-10-06), so it is labelled when used.
    const market = await readMarketVolume(supabase, ticker)
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
        tracked: true,
        price_usd: row.price_usd,
        change_1h_pct: ch1h,
        change_24h_pct: ch24h,
        change_7d_pct: ch7d,
        change_1h_display: formatPct(ch1h),
        change_24h_display: formatPct(ch24h),
        change_7d_display: formatPct(ch7d),
        volume_24h: market ? market.volume : numericOrNull(row.volume_24h),
        volume_scope: market ? 'all exchanges (CoinGecko)' : 'Binance spot pair only',
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
