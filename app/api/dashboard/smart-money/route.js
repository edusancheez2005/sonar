/**
 * GET /api/dashboard/smart-money
 * Returns top trader vs retail positioning for major tokens.
 * 
 * Strategy: Fetches derivatives data directly from Binance.
 * If Binance Futures is geo-blocked (451), falls back to
 * pre-computed derivatives from the signal engine stored in token_signals.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FUTURES_BASE = 'https://fapi.binance.com'
const SPOT_BASE = 'https://data-api.binance.vision'

const TRACKED_TOKENS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE',
  'ADA', 'AVAX', 'LINK', 'PEPE', 'SUI', 'ARB',
]

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function GET() {
  try {
    // Get prices from Binance spot (always works)
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

    // Try Binance Futures directly first
    const testRes = await fetchJson(`${FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=4h&limit=1`)
    const binanceWorking = testRes !== null && Array.isArray(testRes)

    let tokens = []

    if (binanceWorking) {
      // Direct Binance path
      for (let i = 0; i < TRACKED_TOKENS.length; i += 4) {
        const batch = TRACKED_TOKENS.slice(i, i + 4)
        const batchResults = await Promise.all(batch.map(async (token) => {
          const symbol = `${token}USDT`
          const [topTrader, globalRatio, funding, taker] = await Promise.all([
            fetchJson(`${FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=4h&limit=1`),
            fetchJson(`${FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=1`),
            fetchJson(`${FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
            fetchJson(`${FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=4h&limit=1`),
          ])

          const smartLong = topTrader?.[0] ? parseFloat(topTrader[0].longAccount) * 100 : null
          const retailLong = globalRatio?.[0] ? parseFloat(globalRatio[0].longAccount) * 100 : null
          if (smartLong === null || retailLong === null) return null

          const divergence = smartLong - retailLong
          const fundRate = funding?.[0] ? parseFloat(funding[0].fundingRate) * 100 : null
          const takerRatio = taker?.[0] ? parseFloat(taker[0].buySellRatio) : null
          const p = priceMap[token] || { price: 0, change24h: 0 }

          return {
            symbol: token, price: p.price, change24h: Math.round(p.change24h * 100) / 100,
            smartMoney: { longPct: Math.round(smartLong * 10) / 10, shortPct: Math.round((100 - smartLong) * 10) / 10 },
            retail: { longPct: Math.round(retailLong * 10) / 10, shortPct: Math.round((100 - retailLong) * 10) / 10 },
            divergence: Math.round(divergence * 10) / 10,
            fundingRate: fundRate !== null ? Math.round(fundRate * 10000) / 10000 : null,
            takerRatio: takerRatio !== null ? Math.round(takerRatio * 1000) / 1000 : null,
            signal: divergence < -8 ? 'bearish_divergence' : divergence > 8 ? 'bullish_divergence' : 'aligned',
          }
        }))
        tokens.push(...batchResults.filter(Boolean))
      }
    } else {
      // Fallback: read derivatives from latest signal engine results
      const { data: signals } = await supabaseAdmin
        .from('token_signals')
        .select('token, tier1_factors, computed_at')
        .in('token', TRACKED_TOKENS)
        .order('computed_at', { ascending: false })
        .limit(100)

      // Also get latest derivatives from derivativesData stored in signal cron logs
      // Use the whale-whisper data snapshot as fallback
      const { data: whisper } = await supabaseAdmin
        .from('whale_whispers')
        .select('data_snapshot')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const derivSnapshot = whisper?.data_snapshot?.derivatives || {}

      for (const token of TRACKED_TOKENS) {
        const d = derivSnapshot[token]
        const p = priceMap[token] || { price: 0, change24h: 0 }
        if (!d) continue

        const retailLong = parseFloat(d.retailLongPct) || 50
        const smartLong = parseFloat(d.topTraderLongPct) || 50
        const divergence = smartLong - retailLong
        const fundStr = d.fundingRate || '0%'
        const fundRate = parseFloat(fundStr) || 0

        tokens.push({
          symbol: token, price: p.price, change24h: Math.round(p.change24h * 100) / 100,
          smartMoney: { longPct: Math.round(smartLong * 10) / 10, shortPct: Math.round((100 - smartLong) * 10) / 10 },
          retail: { longPct: Math.round(retailLong * 10) / 10, shortPct: Math.round((100 - retailLong) * 10) / 10 },
          divergence: Math.round(divergence * 10) / 10,
          fundingRate: Math.round(fundRate * 10000) / 10000,
          takerRatio: null,
          signal: divergence < -8 ? 'bearish_divergence' : divergence > 8 ? 'bullish_divergence' : 'aligned',
          source: 'cached',
        })
      }
    }

    tokens.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence))

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
