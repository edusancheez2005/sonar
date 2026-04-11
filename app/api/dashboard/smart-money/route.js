/**
 * GET /api/dashboard/smart-money
 * Returns top trader vs retail positioning for major tokens.
 * Data from Binance Futures API (free, no key needed).
 * 
 * Response shape:
 * {
 *   tokens: [
 *     {
 *       symbol: 'BTC',
 *       price: 71000,
 *       change24h: 0.5,
 *       smartMoney: { longPct: 55.2, shortPct: 44.8 },
 *       retail: { longPct: 72.1, shortPct: 27.9 },
 *       divergence: -16.9,  // negative = smart money less bullish than retail
 *       fundingRate: 0.0102,
 *       takerRatio: 1.05,
 *       signal: 'bearish_divergence' | 'bullish_divergence' | 'aligned'
 *     }
 *   ],
 *   summary: { bullishCount, bearishCount, neutralCount, strongestDivergence }
 * }
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FUTURES_BASE = 'https://fapi.binance.com'
const SPOT_BASE = 'https://data-api.binance.vision'

// Tokens with active Binance USDT-M futures
const TRACKED_TOKENS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA',
  'AVAX', 'LINK', 'DOT', 'UNI', 'NEAR', 'ARB', 'OP',
  'SUI', 'PEPE', 'INJ', 'FET', 'ATOM', 'LTC',
]

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function GET() {
  try {
    // Fetch all 24h tickers in one call (weight: 80)
    const allTickers = await fetchJson(`${SPOT_BASE}/api/v3/ticker/24hr`)
    const priceMap = {}
    if (allTickers) {
      for (const t of allTickers) {
        if (t.symbol.endsWith('USDT')) {
          priceMap[t.symbol.replace('USDT', '')] = {
            price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.priceChangePercent),
          }
        }
      }
    }

    // Fetch derivatives data for all tracked tokens in parallel
    const results = await Promise.all(
      TRACKED_TOKENS.map(async (token) => {
        const symbol = `${token}USDT`

        const [topTrader, globalRatio, funding, taker] = await Promise.all([
          fetchJson(`${FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=4h&limit=1`),
          fetchJson(`${FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=1`),
          fetchJson(`${FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
          fetchJson(`${FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=4h&limit=1`),
        ])

        const smartLong = topTrader?.[0] ? parseFloat(topTrader[0].longAccount) * 100 : null
        const retailLong = globalRatio?.[0] ? parseFloat(globalRatio[0].longAccount) * 100 : null
        const fundRate = funding?.[0] ? parseFloat(funding[0].fundingRate) * 100 : null
        const takerRatio = taker?.[0] ? parseFloat(taker[0].buySellRatio) : null

        if (smartLong === null || retailLong === null) return null

        const divergence = smartLong - retailLong // positive = smart money more bullish
        let signal = 'aligned'
        if (divergence < -8) signal = 'bearish_divergence' // smart money less bullish than retail
        else if (divergence > 8) signal = 'bullish_divergence' // smart money more bullish

        const p = priceMap[token] || { price: 0, change24h: 0 }

        return {
          symbol: token,
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
          fundingRate: fundRate !== null ? Math.round(fundRate * 10000) / 10000 : null,
          takerRatio: takerRatio !== null ? Math.round(takerRatio * 1000) / 1000 : null,
          signal,
        }
      })
    )

    const tokens = results.filter(Boolean).sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence))

    const bullishCount = tokens.filter(t => t.signal === 'bullish_divergence').length
    const bearishCount = tokens.filter(t => t.signal === 'bearish_divergence').length
    const neutralCount = tokens.filter(t => t.signal === 'aligned').length
    const strongestDivergence = tokens[0] || null

    return NextResponse.json({
      tokens,
      summary: { bullishCount, bearishCount, neutralCount, strongestDivergence },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[SmartMoney] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
