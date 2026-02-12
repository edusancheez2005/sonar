/**
 * API Route: Get LunarCrush social intelligence for a token
 * Returns galaxy score, sentiment, social dominance, engagement metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchLunarCrushEnhanced } from '@/lib/orca/lunarcrush-api'

export const dynamic = 'force-dynamic'

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    // Check cache
    const cached = cache.get(symbol)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const result = await fetchLunarCrushEnhanced(symbol)

    if (!result.coin && !result.topic) {
      return NextResponse.json({ 
        available: false, 
        symbol,
        message: `Social intelligence for ${symbol} is not yet available.`
      })
    }

    const response = {
      available: true,
      symbol,
      // Coin market data from LunarCrush
      galaxy_score: result.coin?.galaxy_score || result.topic?.galaxy_score || null,
      alt_rank: result.coin?.alt_rank || null,
      volatility: result.coin?.volatility || null,
      percent_change_7d: result.coin?.percent_change_7d || null,
      percent_change_30d: result.coin?.percent_change_30d || null,
      // Topic social data
      sentiment: result.topic?.sentiment || null,
      social_dominance: result.topic?.social_dominance || null,
      interactions_24h: result.topic?.interactions_24h || null,
      posts_24h: result.topic?.posts_24h || null,
      social_contributors: result.topic?.social_contributors || null,
      categories: result.topic?.categories || [],
      interactions_change_7d: result.topic?.interactions_change_7d || null,
      sentiment_change_24h: result.topic?.sentiment_change_24h || null,
      fetchedAt: result.fetchedAt,
    }

    // Cache it
    cache.set(symbol, { data: response, ts: Date.now() })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Social API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social data', available: false },
      { status: 500 }
    )
  }
}
