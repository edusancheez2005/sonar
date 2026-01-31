/**
 * API Route: Get trending coins and top gainers/losers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTrending, getTopGainersLosers } from '@/lib/coingecko/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const duration = searchParams.get('duration') || '24h'

    // Fetch both trending and gainers/losers
    const [trending, gainersLosers] = await Promise.all([
      getTrending(),
      getTopGainersLosers('usd', duration as any),
    ])

    return NextResponse.json({
      success: true,
      trending: trending.coins.map(c => c.item),
      top_gainers: gainersLosers.top_gainers,
      top_losers: gainersLosers.top_losers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Trending API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending data' },
      { status: 500 }
    )
  }
}
