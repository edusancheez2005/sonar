/**
 * GET /api/social/trending-coins
 *
 * Returns top crypto assets ranked by LunarCrush social signals:
 *   - galaxy_score   (0-100, holistic health: price + social + sentiment)
 *   - alt_rank       (1 = strongest social momentum vs market cap)
 *   - sentiment      (0-100, % of social posts that are positive)
 *   - social_dominance (% of crypto-wide social mentions on this asset)
 *   - interactions_24h (likes + reposts + comments + views)
 *
 * Backed by LunarCrush /coins/list/v1. Cached in-memory for 10 min so
 * we stay safely under the 50k req/day plan quota.
 *
 * Query params:
 *   sort:  galaxy_score | alt_rank | interactions_24h | social_dominance | sentiment
 *          (default: galaxy_score)
 *   limit: 1-50 (default 20)
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LC_BASE = 'https://lunarcrush.com/api4'

const VALID_SORTS = new Set([
  'galaxy_score',
  'alt_rank',
  'interactions_24h',
  'social_dominance',
  'sentiment',
])

const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 min

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortRaw = (searchParams.get('sort') || 'galaxy_score').toLowerCase()
    const sort = VALID_SORTS.has(sortRaw) ? sortRaw : 'galaxy_score'
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50)

    if (!LUNARCRUSH_API_KEY) {
      return NextResponse.json(
        { error: 'LUNARCRUSH_API_KEY not configured', coins: [] },
        { status: 503 }
      )
    }

    const cacheKey = `${sort}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true })
    }

    // /coins/list/v1 returns the top ~100 coins ordered by AltRank by
    // default. We sort client-side so we can cheaply re-rank by any
    // social metric without spending extra LC calls.
    const res = await fetch(`${LC_BASE}/public/coins/list/v1`, {
      headers: {
        Authorization: `Bearer ${LUNARCRUSH_API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[trending-coins] LunarCrush ${res.status}: ${body.slice(0, 200)}`)
      return NextResponse.json(
        { error: `LunarCrush ${res.status}`, coins: [] },
        { status: 502 }
      )
    }

    const json = await res.json()
    const raw: any[] = Array.isArray(json?.data) ? json.data : []

    // Drop pure-noise rows (no social activity at all). Keeps the panel
    // honest — if a coin has zero interactions we don't pretend it's
    // "trending socially".
    const cleaned = raw.filter(
      (r) => Number(r?.interactions_24h || 0) > 0 || Number(r?.galaxy_score || 0) > 0
    )

    const sorted = [...cleaned].sort((a, b) => {
      // alt_rank is "lower = better"; everything else is "higher = better".
      if (sort === 'alt_rank') {
        const av = Number(a.alt_rank ?? Number.POSITIVE_INFINITY)
        const bv = Number(b.alt_rank ?? Number.POSITIVE_INFINITY)
        return av - bv
      }
      const av = Number(a[sort] ?? -1)
      const bv = Number(b[sort] ?? -1)
      return bv - av
    })

    const coins = sorted.slice(0, limit).map((c: any) => ({
      id: c.id ?? null,
      symbol: String(c.symbol || '').toUpperCase(),
      name: c.name || c.symbol || '',
      logo: c.logo || null,
      price: c.price != null ? Number(c.price) : null,
      percent_change_24h:
        c.percent_change_24h != null ? Number(c.percent_change_24h) : null,
      market_cap: c.market_cap != null ? Number(c.market_cap) : null,
      market_cap_rank: c.market_cap_rank ?? null,
      // social metrics
      galaxy_score: c.galaxy_score != null ? Number(c.galaxy_score) : null,
      alt_rank: c.alt_rank != null ? Number(c.alt_rank) : null,
      sentiment: c.sentiment != null ? Number(c.sentiment) : null,
      social_dominance:
        c.social_dominance != null ? Number(c.social_dominance) : null,
      interactions_24h:
        c.interactions_24h != null ? Number(c.interactions_24h) : 0,
    }))

    const payload = {
      sort,
      count: coins.length,
      coins,
      generated_at: new Date().toISOString(),
    }
    cache.set(cacheKey, { data: payload, ts: Date.now() })

    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('[trending-coins] error:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'unknown', coins: [] },
      { status: 500 }
    )
  }
}
