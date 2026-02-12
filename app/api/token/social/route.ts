/**
 * API Route: Get LunarCrush social intelligence for a token
 * Returns galaxy score, sentiment, social dominance, engagement metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchLunarCrushEnhanced } from '@/lib/orca/lunarcrush-api'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4'

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Fetch top social posts for a topic from LunarCrush
 */
async function fetchTopPosts(symbol: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${LUNARCRUSH_BASE_URL}/public/topic/${symbol.toLowerCase()}/posts/v1`,
      {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    const posts = json.data || []
    // Return top 5 posts with key fields
    return posts.slice(0, 5).map((p: any) => ({
      title: p.post_title || p.post_text?.slice(0, 120) || '',
      url: p.post_url || '',
      source: p.post_type || 'social',
      creator: p.creator_display_name || p.creator_name || 'Unknown',
      interactions: p.interactions_24h || p.interactions_total || 0,
      sentiment: p.post_sentiment || null,
      created_at: p.post_created ? new Date(p.post_created * 1000).toISOString() : null,
    }))
  } catch (error) {
    console.error(`Error fetching LunarCrush posts for ${symbol}:`, error)
    return []
  }
}

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

    const [result, topPosts] = await Promise.all([
      fetchLunarCrushEnhanced(symbol),
      fetchTopPosts(symbol)
    ])

    if (!result.coin && !result.topic && topPosts.length === 0) {
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
      top_posts: topPosts,
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
