/**
 * API Route: price movers for /trending (top gainers and losers).
 * Data source: Binance rolling-window tickers over the symbols we map
 * (lib/binance/symbol-map.ts); ?window=1h | 24h | 7d.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRollingTicker } from '@/lib/binance/client'
import { getAllPairs, pairToSymbol } from '@/lib/binance/symbol-map'
import { getTokenLogos } from '@/lib/logos/getTokenLogos'
import { TOKEN_NAMES } from '@/lib/trending/tokenNames'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// 1H / 24H / 7D are real Binance rolling windows (the old 1H/7D/30D buttons
// re-fetched the same 24 h data and relabelled it; Binance has no 30 d window).
const WINDOWS: Record<string, string> = { '1h': '1h', '24h': '1d', '7d': '7d' }

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get('window') || request.nextUrl.searchParams.get('duration') || '24h').toLowerCase()
  const window = WINDOWS[raw] ? raw : '24h'
  try {
    const pairs = getAllPairs()
    const tickers = await getRollingTicker(pairs, WINDOWS[window])
    const rows = tickers
      .map((t) => {
        const sym = pairToSymbol(t.symbol)
        if (!sym || !Number.isFinite(t.priceChangePercent) || !(t.lastPrice > 0)) return null
        return {
          symbol: sym,
          name: TOKEN_NAMES[sym] || sym,
          image: null as string | null,
          price: t.lastPrice,
          change_pct: t.priceChangePercent,
          quote_volume: t.quoteVolume,
        }
      })
      .filter(Boolean) as Array<{ symbol: string; name: string; image: string | null; price: number; change_pct: number; quote_volume: number }>

    const logos = await getTokenLogos(rows.map((r) => r.symbol))
    for (const r of rows) r.image = logos[r.symbol] || null

    const byChange = [...rows].sort((a, b) => b.change_pct - a.change_pct)
    return NextResponse.json(
      {
        success: true,
        window,
        source: 'binance',
        generated_at: new Date().toISOString(),
        gainers: byChange.slice(0, 10),
        losers: byChange.slice(-10).reverse(),
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (error) {
    console.error('Trending movers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price movers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
