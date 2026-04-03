/**
 * API Route: LunarCrush Sentiment Time-Series for a token
 * Returns sentiment, interactions, and posts over time
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4'

// Cache: 15 min TTL per symbol+interval
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 15 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toLowerCase()
    const interval = searchParams.get('interval') || '1w' // 1d, 1w, 1m, 3m, 1y

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const cacheKey = `${symbol}:${interval}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Map interval to LunarCrush params
    const intervalMap: Record<string, { bucket: string; start?: number }> = {
      '1d': { bucket: 'hour', start: Math.floor(Date.now() / 1000) - 86400 },
      '1w': { bucket: 'hour', start: Math.floor(Date.now() / 1000) - 604800 },
      '1m': { bucket: 'day', start: Math.floor(Date.now() / 1000) - 2592000 },
      '3m': { bucket: 'day', start: Math.floor(Date.now() / 1000) - 7776000 },
      '1y': { bucket: 'day', start: Math.floor(Date.now() / 1000) - 31536000 },
    }

    const params = intervalMap[interval] || intervalMap['1w']
    const url = new URL(`${LUNARCRUSH_BASE_URL}/public/topic/${symbol}/time-series/v2`)
    if (params.bucket) url.searchParams.set('bucket', params.bucket)
    if (params.start) url.searchParams.set('start', String(params.start))

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`LunarCrush time-series error: ${res.status}`)
      return NextResponse.json({ error: 'Failed to fetch time series', data: [] }, { status: res.status })
    }

    const json = await res.json()
    const rawData = json.data || json.timeSeries || []

    // Normalize the response
    const timeSeries = rawData.map((point: any) => ({
      timestamp: point.time || point.timestamp || point.t,
      sentiment: point.sentiment ?? point.average_sentiment ?? null,
      interactions: point.interactions ?? point.interactions_24h ?? 0,
      posts: point.num_posts ?? point.posts ?? point.social_volume ?? 0,
      contributors: point.contributors ?? point.social_contributors ?? 0,
      galaxy_score: point.galaxy_score ?? null,
    }))

    const response = {
      symbol: symbol.toUpperCase(),
      interval,
      data: timeSeries,
      count: timeSeries.length,
    }

    cache.set(cacheKey, { data: response, ts: Date.now() })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Social time-series API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social time series', data: [] },
      { status: 500 }
    )
  }
}
