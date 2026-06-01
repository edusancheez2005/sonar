/**
 * Tool: getTrendingSocial
 * =============================================================================
 * Market-wide social-momentum leaderboard. Unlike getSocial (which needs a
 * specific ticker), this answers "which tokens are hot right now by social
 * momentum?" — it ranks assets by LunarCrush social signals (galaxy_score,
 * alt_rank, interactions_24h, social_dominance).
 *
 * Backed by LunarCrush /coins/list/v1 — the same source the public /trending
 * page consumes via /api/social/trending-coins. We call LunarCrush directly
 * (no internal HTTP hop) and apply the same quality floor so tiny/unranked
 * tokens with galaxy_score=100 and no real activity don't dominate.
 */
import type { SupabaseLike, ToolResult } from '../types'

const LC_BASE = 'https://lunarcrush.com/api4'

const VALID_SORTS = new Set([
  'galaxy_score',
  'alt_rank',
  'interactions_24h',
  'social_dominance',
  'sentiment',
])

const MIN_MARKET_CAP = 50_000_000 // $50M floor — keeps it to real assets
const MIN_INTERACTIONS = 1_000 // basic social pulse

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
  const sort = normaliseSort(args.sort)
  const limit = clampLimit(args.limit)

  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) {
    return { ok: false, data: null, source: 'lunarcrush_coins_list', fetched_at, error: 'lunarcrush_unconfigured' }
  }

  try {
    const res = await fetchImpl(`${LC_BASE}/public/coins/list/v1`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const isQuota = res.status === 429 || /rate limit|quota/i.test(body)
      return {
        ok: false,
        data: null,
        source: 'lunarcrush_coins_list',
        fetched_at,
        error: isQuota ? 'lunarcrush_quota_exhausted' : `lunarcrush_${res.status}`,
      }
    }

    const json = await res.json()
    const raw: any[] = Array.isArray(json?.data) ? json.data : []
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
      symbol: String(c.symbol || '').toUpperCase(),
      name: c.name || c.symbol || '',
      price: c.price != null ? Number(c.price) : null,
      percent_change_24h: c.percent_change_24h != null ? Number(c.percent_change_24h) : null,
      market_cap: c.market_cap != null ? Number(c.market_cap) : null,
      galaxy_score: c.galaxy_score != null ? Number(c.galaxy_score) : null,
      alt_rank: c.alt_rank != null ? Number(c.alt_rank) : null,
      sentiment: c.sentiment != null ? Number(c.sentiment) : null,
      social_dominance: c.social_dominance != null ? Number(c.social_dominance) : null,
      interactions_24h: c.interactions_24h != null ? Number(c.interactions_24h) : 0,
    }))

    if (coins.length === 0) {
      return { ok: false, data: null, source: 'lunarcrush_coins_list', fetched_at, error: 'no_trending_data' }
    }

    return { ok: true, data: { sort, count: coins.length, coins }, source: 'lunarcrush_coins_list', fetched_at }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'lunarcrush_coins_list',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function normaliseSort(raw: unknown): string {
  if (typeof raw !== 'string') return 'galaxy_score'
  const s = raw.trim().toLowerCase()
  return VALID_SORTS.has(s) ? s : 'galaxy_score'
}

function clampLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 10
  return Math.min(Math.max(Math.trunc(n), 1), 25)
}
