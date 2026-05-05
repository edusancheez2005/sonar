/**
 * GET /api/social/trending-coins
 *
 * Returns top crypto assets ranked by LunarCrush social signals:
 *   - galaxy_score, alt_rank, sentiment, social_dominance, interactions_24h
 *
 * Backed by LunarCrush /coins/list/v1.
 *
 * Failure modes (always 200, status in JSON body):
 *   - 'ok'              fresh upstream data
 *   - 'cached'          served from <10min hot cache
 *   - 'stale'           upstream failed, served from <24h cache
 *   - 'quota_exhausted' LunarCrush 429 / no cache
 *   - 'unconfigured'    LUNARCRUSH_API_KEY missing
 *   - 'upstream_error'  other LunarCrush failure
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

type CacheEntry = { data: any; ts: number }
const cache = new Map<string, CacheEntry>()
const HOT_TTL = 10 * 60 * 1000           // 10 min — hot path
const STALE_TTL = 24 * 60 * 60 * 1000    // 24h — fallback when upstream is down

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sortRaw = (searchParams.get('sort') || 'galaxy_score').toLowerCase()
  const sort = VALID_SORTS.has(sortRaw) ? sortRaw : 'galaxy_score'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50)
  const cacheKey = `${sort}:${limit}`

  if (!LUNARCRUSH_API_KEY) {
    return NextResponse.json({
      status: 'unconfigured',
      message: 'LUNARCRUSH_API_KEY not configured on the server.',
      sort,
      coins: [],
    })
  }

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < HOT_TTL) {
    return NextResponse.json({ ...cached.data, status: 'cached' })
  }

  try {
    const res = await fetch(`${LC_BASE}/public/coins/list/v1`, {
      headers: {
        Authorization: `Bearer ${LUNARCRUSH_API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const isQuota = res.status === 429 || /rate limit|quota/i.test(body)
      const isDaily = /daily/i.test(body)
      console.error(`[trending-coins] LunarCrush ${res.status}: ${body.slice(0, 200)}`)

      if (cached && Date.now() - cached.ts < STALE_TTL) {
        return NextResponse.json({
          ...cached.data,
          status: 'stale',
          stale_reason: isQuota
            ? `LunarCrush ${isDaily ? 'daily' : 'minute'} quota exhausted`
            : `LunarCrush ${res.status}`,
          stale_age_seconds: Math.round((Date.now() - cached.ts) / 1000),
        })
      }

      return NextResponse.json({
        status: isQuota ? 'quota_exhausted' : 'upstream_error',
        message: isQuota
          ? `LunarCrush ${isDaily ? 'daily' : 'per-minute'} quota exhausted. Resets at 00:00 UTC.`
          : `LunarCrush returned ${res.status}.`,
        sort,
        coins: [],
      })
    }

    const json = await res.json()
    const raw: any[] = Array.isArray(json?.data) ? json.data : []

    // LunarCrush assigns galaxy_score=100 to many tiny / unranked tokens
    // with effectively zero social activity, which would otherwise dominate
    // a galaxy-score-sorted leaderboard. Require BOTH meaningful market cap
    // AND non-trivial 24h interactions to qualify as "trending".
    const MIN_MARKET_CAP = 50_000_000     // $50M floor — keeps it to real assets
    const MIN_INTERACTIONS = 1_000        // basic social pulse
    const cleaned = raw.filter((r) => {
      const mc = Number(r?.market_cap || 0)
      const ix = Number(r?.interactions_24h || 0)
      return mc >= MIN_MARKET_CAP && ix >= MIN_INTERACTIONS
    })

    const sorted = [...cleaned].sort((a, b) => {
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
      percent_change_24h: c.percent_change_24h != null ? Number(c.percent_change_24h) : null,
      market_cap: c.market_cap != null ? Number(c.market_cap) : null,
      market_cap_rank: c.market_cap_rank ?? null,
      galaxy_score: c.galaxy_score != null ? Number(c.galaxy_score) : null,
      alt_rank: c.alt_rank != null ? Number(c.alt_rank) : null,
      sentiment: c.sentiment != null ? Number(c.sentiment) : null,
      social_dominance: c.social_dominance != null ? Number(c.social_dominance) : null,
      interactions_24h: c.interactions_24h != null ? Number(c.interactions_24h) : 0,
    }))

    const payload = {
      status: 'ok' as const,
      sort,
      count: coins.length,
      coins,
      generated_at: new Date().toISOString(),
    }
    cache.set(cacheKey, { data: payload, ts: Date.now() })
    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('[trending-coins] error:', e?.message || e)
    if (cached && Date.now() - cached.ts < STALE_TTL) {
      return NextResponse.json({
        ...cached.data,
        status: 'stale',
        stale_reason: e?.message || 'fetch failed',
        stale_age_seconds: Math.round((Date.now() - cached.ts) / 1000),
      })
    }
    return NextResponse.json({
      status: 'upstream_error',
      message: e?.message || 'fetch failed',
      sort,
      coins: [],
    })
  }
}
