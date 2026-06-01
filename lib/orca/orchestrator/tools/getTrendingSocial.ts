/**
 * Tool: getTrendingSocial
 * =============================================================================
 * Market-wide social-momentum leaderboard. Backed by the shared LunarCrush
 * cache in lib/social/trendingCoins (the same source the /trending page uses)
 * so prod queries hit the 10-min hot cache and gracefully degrade to a 24h
 * stale fallback when LunarCrush is rate-limited.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { fetchTrendingCoins } from '@/lib/social/trendingCoins'

export interface GetTrendingSocialArgs {
  sort?: unknown
  limit?: unknown
}

export async function run(
  args: GetTrendingSocialArgs,
  _supabase: SupabaseLike,
  now: () => Date = () => new Date(),
  fetchImpl: typeof fetch = fetch
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const result = await fetchTrendingCoins({
    sort: args.sort,
    limit: args.limit ?? 10,
    defaultLimit: 10,
    maxLimit: 25,
    fetchImpl,
    now,
  })

  if (
    result.status === 'unconfigured' ||
    result.status === 'quota_exhausted' ||
    result.status === 'upstream_error'
  ) {
    const errorMap = {
      unconfigured: 'lunarcrush_unconfigured',
      quota_exhausted: 'lunarcrush_quota_exhausted',
      upstream_error: 'lunarcrush_upstream_error',
    } as const
    return {
      ok: false,
      data: null,
      source: 'lunarcrush_coins_list',
      fetched_at,
      error: errorMap[result.status as keyof typeof errorMap],
    }
  }

  if (result.coins.length === 0) {
    return {
      ok: false,
      data: null,
      source: 'lunarcrush_coins_list',
      fetched_at,
      error: 'no_trending_data',
    }
  }

  // Project to the shape ORCA's writer/renderer expects (slim — no id/logo).
  const coins = result.coins.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    percent_change_24h: c.percent_change_24h,
    market_cap: c.market_cap,
    galaxy_score: c.galaxy_score,
    alt_rank: c.alt_rank,
    sentiment: c.sentiment,
    social_dominance: c.social_dominance,
    interactions_24h: c.interactions_24h,
  }))

  return {
    ok: true,
    data: {
      sort: result.sort,
      count: coins.length,
      coins,
      cache_status: result.status,
      ...(result.stale_reason ? { stale_reason: result.stale_reason } : {}),
    },
    source: 'lunarcrush_coins_list',
    fetched_at,
  }
}
