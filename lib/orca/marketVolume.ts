/**
 * Market-wide 24h trading volume per symbol (all exchanges, from CoinGecko),
 * written to app_cache by the fetch-prices cron every 15 minutes.
 *
 * price_snapshots.volume_24h is ONE Binance USDT pair, 6-23x lower than the
 * market (BTC $1.18B vs ~$27B), and ORCA quoted it as "24h volume" and called
 * turnover "thin" (audit 2026-10-06). The snapshots keep the pair figure
 * because the signal engine compares it across snapshots.
 */
export const MARKET_VOLUME_CACHE_KEY = 'market_volume_24h'
const MAX_AGE_MS = 2 * 60 * 60 * 1000

export interface MarketVolume {
  volume: number
  updated_at: string
}

/** null when the symbol has no fresh market-wide figure (callers fall back to the pair volume). */
export async function readMarketVolume(supabase: any, symbol: string): Promise<MarketVolume | null> {
  try {
    const { data } = await supabase
      .from('app_cache')
      .select('value')
      .eq('key', MARKET_VOLUME_CACHE_KEY)
      .maybeSingle()
    const v = data?.value
    const vol = Number(v?.volumes?.[String(symbol).toUpperCase()])
    if (!Number.isFinite(vol) || vol <= 0) return null
    const age = Date.now() - Date.parse(String(v?.updated_at ?? ''))
    if (!Number.isFinite(age) || age > MAX_AGE_MS) return null
    return { volume: vol, updated_at: String(v.updated_at) }
  } catch {
    return null
  }
}
