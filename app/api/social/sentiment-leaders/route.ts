/**
 * API Route: LunarCrush Sentiment Leaders
 * Pulls the global coins/list/v2 feed and returns three slices:
 *   - bullish:   top tokens by sentiment %, filtered to those with real social volume
 *   - discussed: top tokens by 24h X/social interactions
 *   - climbers:  biggest 24h improvement in alt_rank (sentiment + activity surge)
 *
 * Cached for 10 minutes to stay well within LunarCrush quota.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LUNARCRUSH_URL = 'https://lunarcrush.com/api4/public/coins/list/v2'

const CACHE_TTL = 10 * 60 * 1000 // 10 min
let cache: { ts: number; data: any } | null = null

type RawCoin = {
  id?: number
  symbol?: string
  name?: string
  price?: number
  market_cap?: number
  market_cap_rank?: number
  percent_change_24h?: number
  galaxy_score?: number
  alt_rank?: number
  alt_rank_previous?: number
  sentiment?: number
  interactions_24h?: number
  social_volume_24h?: number
  social_dominance?: number
  logo?: string
}

type Leader = {
  symbol: string
  name: string
  price: number | null
  market_cap_rank: number | null
  change_24h_pct: number | null
  galaxy_score: number | null
  alt_rank: number | null
  alt_rank_delta: number | null  // positive = climbed (rank got smaller)
  sentiment: number | null        // 0-100
  interactions_24h: number
  social_volume_24h: number
  social_dominance: number | null
  logo: string | null
}

function mapCoin(c: RawCoin): Leader {
  const altPrev = typeof c.alt_rank_previous === 'number' ? c.alt_rank_previous : null
  const altNow = typeof c.alt_rank === 'number' ? c.alt_rank : null
  const altDelta = altPrev != null && altNow != null ? altPrev - altNow : null

  return {
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name || c.symbol || '',
    price: c.price ?? null,
    market_cap_rank: c.market_cap_rank ?? null,
    change_24h_pct: typeof c.percent_change_24h === 'number' ? c.percent_change_24h : null,
    galaxy_score: c.galaxy_score ?? null,
    alt_rank: altNow,
    alt_rank_delta: altDelta,
    sentiment: typeof c.sentiment === 'number' ? c.sentiment : null,
    interactions_24h: c.interactions_24h ?? 0,
    social_volume_24h: c.social_volume_24h ?? 0,
    social_dominance: c.social_dominance ?? null,
    logo: c.logo ?? null,
  }
}

export async function GET(_request: NextRequest) {
  try {
    if (!LUNARCRUSH_API_KEY) {
      return NextResponse.json({ error: 'LunarCrush key not configured' }, { status: 503 })
    }

    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({ ...cache.data, cached: true })
    }

    const res = await fetch(LUNARCRUSH_URL, {
      headers: {
        Authorization: `Bearer ${LUNARCRUSH_API_KEY}`,
        Accept: 'application/json',
      },
      // LunarCrush returns ~hundreds of coins; one call covers all three slices
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      console.error(`LunarCrush coins/list/v2 error: ${res.status}`)
      return NextResponse.json({ error: `LunarCrush ${res.status}`, bullish: [], discussed: [], climbers: [] }, { status: 502 })
    }

    const json = await res.json()
    const raw: RawCoin[] = Array.isArray(json?.data) ? json.data : []
    const all = raw.map(mapCoin).filter((c) => c.symbol)

    // Filter floor: coins with at least some real X chatter so we don't surface dead tokens
    const withSocial = all.filter((c) => c.interactions_24h >= 5_000 && c.sentiment != null)

    const bullish = [...withSocial]
      .sort((a, b) => (b.sentiment ?? 0) - (a.sentiment ?? 0) || b.interactions_24h - a.interactions_24h)
      .slice(0, 20)

    const discussed = [...all]
      .filter((c) => c.interactions_24h > 0)
      .sort((a, b) => b.interactions_24h - a.interactions_24h)
      .slice(0, 20)

    const climbers = [...all]
      .filter((c) => c.alt_rank_delta != null && c.alt_rank_delta >= 5 && c.interactions_24h >= 1_000)
      .sort((a, b) => (b.alt_rank_delta ?? 0) - (a.alt_rank_delta ?? 0))
      .slice(0, 20)

    const data = {
      bullish,
      discussed,
      climbers,
      total_coins: all.length,
      generated_at: new Date().toISOString(),
      cached: false,
    }

    cache = { ts: Date.now(), data }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('sentiment-leaders error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error', bullish: [], discussed: [], climbers: [] }, { status: 500 })
  }
}
