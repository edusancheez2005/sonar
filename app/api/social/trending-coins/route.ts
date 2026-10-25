/**
 * GET /api/social/trending-coins
 *
 * Returns top crypto assets ranked by LunarCrush social signals:
 *   - galaxy_score, alt_rank, sentiment, social_dominance, interactions_24h
 *
 * Backed by lib/social/trendingCoins (shared with ORCA's getTrendingSocial
 * tool so both surfaces share the same 10-min hot cache and 24h stale
 * fallback).
 *
 * Always returns 200; status lives in the JSON body:
 *   ok | cached | stale | quota_exhausted | unconfigured | upstream_error
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchTrendingCoins } from '@/lib/social/trendingCoins'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const result = await fetchTrendingCoins({
    sort: searchParams.get('sort') || 'galaxy_score',
    limit: searchParams.get('limit') || 20,
    defaultLimit: 20,
    maxLimit: 50,
  })
  // Shared at the edge for 5 minutes (the fetcher's own cache is per lambda).
  const ok = result.status === 'ok' || result.status === 'cached'
  return NextResponse.json(result, {
    headers: { 'Cache-Control': ok ? 's-maxage=300, stale-while-revalidate=600' : 'no-store' },
  })
}
