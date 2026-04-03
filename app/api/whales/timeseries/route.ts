/**
 * API Route: Whale Activity Time-Series for a specific token
 * Returns buy/sell volume and count bucketed by hour or day
 * 
 * Query params:
 *   - symbol: Token symbol (required, e.g. BTC, ETH)
 *   - days: Number of days to look back (default 7, max 90)
 *   - bucket: 'hour' or 'day' (default: auto based on days)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()
    const days = Math.min(Number(searchParams.get('days') || 7), 90)
    const bucketParam = searchParams.get('bucket')

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    // Determine bucket size
    const bucket = bucketParam || (days <= 1 ? 'hour' : days <= 7 ? 'hour' : 'day')

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Query all whale transactions for this token in the time range
    const { data: txns, error } = await supabase
      .from('all_whale_transactions')
      .select('timestamp, classification, usd_value')
      .eq('token_symbol', symbol)
      .in('classification', ['BUY', 'SELL'])
      .gte('timestamp', since)
      .gt('usd_value', 0)
      .order('timestamp', { ascending: true })
      .limit(5000)

    if (error) {
      console.error('Whale timeseries query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!txns || txns.length === 0) {
      return NextResponse.json({
        symbol,
        days,
        bucket,
        data: [],
        summary: { totalBuyVolume: 0, totalSellVolume: 0, totalBuyCount: 0, totalSellCount: 0 },
      })
    }

    // Bucket the transactions
    const buckets = new Map<string, {
      timestamp: number
      buyVolume: number
      sellVolume: number
      buyCount: number
      sellCount: number
    }>()

    let totalBuyVolume = 0
    let totalSellVolume = 0
    let totalBuyCount = 0
    let totalSellCount = 0

    for (const tx of txns) {
      const date = new Date(tx.timestamp)
      let key: string
      let bucketTime: number

      if (bucket === 'hour') {
        date.setMinutes(0, 0, 0)
        key = date.toISOString()
        bucketTime = Math.floor(date.getTime() / 1000)
      } else {
        date.setHours(0, 0, 0, 0)
        key = date.toISOString().slice(0, 10)
        bucketTime = Math.floor(date.getTime() / 1000)
      }

      if (!buckets.has(key)) {
        buckets.set(key, {
          timestamp: bucketTime,
          buyVolume: 0,
          sellVolume: 0,
          buyCount: 0,
          sellCount: 0,
        })
      }

      const b = buckets.get(key)!
      const usd = tx.usd_value || 0

      if (tx.classification === 'BUY') {
        b.buyVolume += usd
        b.buyCount += 1
        totalBuyVolume += usd
        totalBuyCount += 1
      } else {
        b.sellVolume += usd
        b.sellCount += 1
        totalSellVolume += usd
        totalSellCount += 1
      }
    }

    // Convert to sorted array
    const data = Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp)

    return NextResponse.json({
      symbol,
      days,
      bucket,
      data,
      summary: {
        totalBuyVolume,
        totalSellVolume,
        totalBuyCount,
        totalSellCount,
        netFlow: totalBuyVolume - totalSellVolume,
        buySellRatio: totalSellCount > 0 ? (totalBuyCount / totalSellCount).toFixed(2) : 'N/A',
      },
    }, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' }
    })

  } catch (error) {
    console.error('Whale timeseries API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whale time series' },
      { status: 500 }
    )
  }
}
