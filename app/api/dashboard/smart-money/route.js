/**
 * GET /api/dashboard/smart-money
 * Returns top trader vs retail positioning from cached derivatives data.
 * Data is refreshed every 5min by /api/cron/cache-derivatives.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Read from cache (populated by cron every 5min)
    const { data: cached, error } = await supabaseAdmin
      .from('derivatives_cache')
      .select('*')
      .order('token')

    if (error || !cached || cached.length === 0) {
      return NextResponse.json({
        tokens: [],
        summary: { bullishCount: 0, bearishCount: 0, neutralCount: 0, strongestDivergence: null },
        timestamp: new Date().toISOString(),
      })
    }

    // Get spot prices
    let priceMap = {}
    try {
      const res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const tickers = await res.json()
        for (const t of tickers) {
          if (t.symbol.endsWith('USDT')) {
            priceMap[t.symbol.replace('USDT', '')] = {
              price: parseFloat(t.lastPrice),
              change24h: parseFloat(t.priceChangePercent),
            }
          }
        }
      }
    } catch {}

    const tokens = cached.map(c => {
      const smartLong = (c.smart_long || 0.5) * 100
      const retailLong = (c.retail_long || 0.5) * 100
      const divergence = smartLong - retailLong
      const fundRate = c.funding_rate ? c.funding_rate * 100 : 0
      const p = priceMap[c.token] || { price: 0, change24h: 0 }

      return {
        symbol: c.token,
        price: p.price,
        change24h: Math.round(p.change24h * 100) / 100,
        smartMoney: {
          longPct: Math.round(smartLong * 10) / 10,
          shortPct: Math.round((100 - smartLong) * 10) / 10,
        },
        retail: {
          longPct: Math.round(retailLong * 10) / 10,
          shortPct: Math.round((100 - retailLong) * 10) / 10,
        },
        divergence: Math.round(divergence * 10) / 10,
        fundingRate: Math.round(fundRate * 10000) / 10000,
        takerRatio: c.taker_ratio ? Math.round(c.taker_ratio * 1000) / 1000 : null,
        signal: divergence < -8 ? 'bearish_divergence' : divergence > 8 ? 'bullish_divergence' : 'aligned',
        updatedAt: c.updated_at,
      }
    }).sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence))

    const bullishCount = tokens.filter(t => t.signal === 'bullish_divergence').length
    const bearishCount = tokens.filter(t => t.signal === 'bearish_divergence').length
    const neutralCount = tokens.filter(t => t.signal === 'aligned').length

    return NextResponse.json({
      tokens,
      summary: { bullishCount, bearishCount, neutralCount, strongestDivergence: tokens[0] || null },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
