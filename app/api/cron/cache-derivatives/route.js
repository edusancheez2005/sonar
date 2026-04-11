/**
 * CRON: Cache Derivatives Data
 * Schedule: Every 5 minutes
 * 
 * Uses the same fetchDerivativesData function as the signal engine
 * (which successfully fetches from Binance Futures).
 * Stores results in derivatives_cache table for the smart-money dashboard.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { fetchDerivativesData } from '@/app/lib/derivativesData'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'PEPE', 'SUI', 'ARB']

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = []

    // Process sequentially to avoid rate limits
    for (const token of TOKENS) {
      try {
        const d = await fetchDerivativesData(token)
        if (d && d.available) {
          results.push({
            token,
            smart_long: d.topTraderLongRatio,
            smart_short: d.topTraderShortRatio,
            retail_long: d.longRatio,
            retail_short: d.shortRatio,
            funding_rate: d.fundingRate,
            taker_ratio: d.takerBuySellRatio,
            updated_at: new Date().toISOString(),
          })
        }
      } catch {}
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No derivatives data available', tokens: 0 }, { status: 503 })
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

    return NextResponse.json({ success: true, tokens: results.length })
  } catch (err) {
    console.error('[DerivativesCache] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
