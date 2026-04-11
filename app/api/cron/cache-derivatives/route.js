/**
 * CRON: Cache Derivatives Data
 * Schedule: Every 5 minutes
 * 
 * Fetches top trader + retail long/short ratios from Binance Futures
 * and stores in Supabase. The smart-money dashboard API then reads
 * from this cache instead of calling Binance directly (which is
 * geo-blocked from Vercel US IPs on user-facing requests).
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FUTURES_BASE = 'https://fapi.binance.com'
const TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'PEPE', 'SUI', 'ARB']

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = []

    // Process in batches of 4
    for (let i = 0; i < TOKENS.length; i += 4) {
      const batch = TOKENS.slice(i, i + 4)
      const batchResults = await Promise.all(batch.map(async (token) => {
        const symbol = `${token}USDT`
        const [topTrader, globalRatio, funding, taker] = await Promise.all([
          fetchJson(`${FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`),
          fetchJson(`${FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`),
          fetchJson(`${FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
          fetchJson(`${FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=5m&limit=1`),
        ])

        if (!topTrader?.[0] || !globalRatio?.[0]) return null

        return {
          token,
          smart_long: parseFloat(topTrader[0].longAccount),
          smart_short: parseFloat(topTrader[0].shortAccount),
          retail_long: parseFloat(globalRatio[0].longAccount),
          retail_short: parseFloat(globalRatio[0].shortAccount),
          funding_rate: funding?.[0] ? parseFloat(funding[0].fundingRate) : null,
          taker_ratio: taker?.[0] ? parseFloat(taker[0].buySellRatio) : null,
          updated_at: new Date().toISOString(),
        }
      }))
      results.push(...batchResults.filter(Boolean))
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'Binance Futures unavailable (geo-blocked)', tokens: 0 }, { status: 503 })
    }

    // Upsert into derivatives_cache table
    for (const r of results) {
      await supabaseAdmin
        .from('derivatives_cache')
        .upsert({ 
          token: r.token, 
          smart_long: r.smart_long,
          smart_short: r.smart_short,
          retail_long: r.retail_long,
          retail_short: r.retail_short,
          funding_rate: r.funding_rate,
          taker_ratio: r.taker_ratio,
          updated_at: r.updated_at,
        }, { onConflict: 'token' })
    }

    return NextResponse.json({ success: true, tokens: results.length, data: results })
  } catch (err) {
    console.error('[DerivativesCache] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
