/**
 * API Route: LunarCrush Category Topics
 * Returns top tokens by social volume for a given category (defi, memecoins, layer-1, nfts, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4'

// Cache: 10 min per category
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.toLowerCase()
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50)

    if (!category) {
      return NextResponse.json({ error: 'Category required' }, { status: 400 })
    }

    const cacheKey = `${category}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const res = await fetch(
      `${LUNARCRUSH_BASE_URL}/public/category/${category}/topics/v1`,
      {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const isQuota = res.status === 429 || /rate limit|quota/i.test(body)
      const isDaily = /daily/i.test(body)
      console.error(`LunarCrush category API error: ${res.status} ${body.slice(0, 200)}`)
      // Serve stale cache up to 24h if upstream is broken/quota-limited.
      const stale = cache.get(cacheKey)
      if (stale && Date.now() - stale.ts < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          ...stale.data,
          status: 'stale',
          stale_reason: isQuota
            ? `LunarCrush ${isDaily ? 'daily' : 'minute'} quota exhausted`
            : `LunarCrush ${res.status}`,
          stale_age_seconds: Math.round((Date.now() - stale.ts) / 1000),
        })
      }
      return NextResponse.json({
        status: isQuota ? 'quota_exhausted' : 'upstream_error',
        message: isQuota
          ? `LunarCrush ${isDaily ? 'daily' : 'per-minute'} quota exhausted. Resets at 00:00 UTC.`
          : `LunarCrush returned ${res.status}.`,
        category,
        topics: [],
      })
    }

    const json = await res.json()
    const rawTopics = json.data || []

    const topics = rawTopics.slice(0, limit).map((t: any) => ({
      topic: t.topic || '',
      title: t.title || t.topic || '',
      symbol: (t.topic || '').toUpperCase(),
      galaxy_score: t.galaxy_score ?? null,
      sentiment: t.sentiment ?? null,
      interactions_24h: t.interactions_24h ?? t.interactions ?? 0,
      social_dominance: t.social_dominance ?? null,
      posts_24h: t.num_posts ?? t.posts_24h ?? 0,
      contributors: t.contributors ?? t.social_contributors ?? 0,
      categories: t.categories || [],
    }))

    const response = { status: 'ok', category, topics, count: topics.length }

    cache.set(cacheKey, { data: response, ts: Date.now() })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Category topics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category topics', topics: [] },
      { status: 500 }
    )
  }
}
