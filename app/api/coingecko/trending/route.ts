/**
 * API Route: Get trending coins and top gainers/losers
 * Uses /coins/markets as fallback for gainers/losers (compatible with all API tiers)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTrending, getCoinsMarkets } from '@/lib/coingecko/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'

    // Map timeframe to price_change_percentage parameter
    const priceChangeParam = timeframe === '1h' ? '1h' 
      : timeframe === '7d' ? '7d'
      : timeframe === '30d' ? '30d'
      : '24h'

    // Fetch trending and market data
    const [trending, marketData] = await Promise.all([
      getTrending(),
      getCoinsMarkets({
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: false,
        price_change_percentage: priceChangeParam,
      })
    ])

    // Calculate gainers and losers from market data
    const sortedByChange = [...marketData].sort((a, b) => {
      const aChange = timeframe === '1h' ? (a.price_change_percentage_1h_in_currency || 0)
        : timeframe === '7d' ? (a.price_change_percentage_7d_in_currency || 0)
        : timeframe === '30d' ? (a.price_change_percentage_30d_in_currency || 0)
        : (a.price_change_percentage_24h || 0)
      
      const bChange = timeframe === '1h' ? (b.price_change_percentage_1h_in_currency || 0)
        : timeframe === '7d' ? (b.price_change_percentage_7d_in_currency || 0)
        : timeframe === '30d' ? (b.price_change_percentage_30d_in_currency || 0)
        : (b.price_change_percentage_24h || 0)
      
      return bChange - aChange
    })

    const top_gainers = sortedByChange.slice(0, 20).map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      price_change_percentage: timeframe === '1h' ? coin.price_change_percentage_1h_in_currency
        : timeframe === '7d' ? coin.price_change_percentage_7d_in_currency
        : timeframe === '30d' ? coin.price_change_percentage_30d_in_currency
        : coin.price_change_percentage_24h,
    }))

    const top_losers = sortedByChange.slice(-20).reverse().map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      price_change_percentage: timeframe === '1h' ? coin.price_change_percentage_1h_in_currency
        : timeframe === '7d' ? coin.price_change_percentage_7d_in_currency
        : timeframe === '30d' ? coin.price_change_percentage_30d_in_currency
        : coin.price_change_percentage_24h,
    }))

    return NextResponse.json({
      success: true,
      trending: trending.coins.map(c => c.item),
      top_gainers,
      top_losers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Trending API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
