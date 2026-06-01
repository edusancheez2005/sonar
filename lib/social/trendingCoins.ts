/**
 * Shared LunarCrush trending-coins fetcher with in-memory cache.
 * Used by both /api/social/trending-coins (the public route powering /trending)
 * and the ORCA orchestrator tool getTrendingSocial. Sharing the module-level
 * cache means an ORCA query and a /trending page view both benefit from the
 * same 10-min hot cache and 24h stale fallback.
 */

const LC_BASE = 'https://lunarcrush.com/api4'

export const VALID_SORTS = new Set([
  'galaxy_score',
  'alt_rank',
  'interactions_24h',
  'social_dominance',
  'sentiment',
])

export const MIN_MARKET_CAP = 50_000_000
export const MIN_INTERACTIONS = 1_000

const HOT_TTL = 10 * 60 * 1000
const STALE_TTL = 24 * 60 * 60 * 1000

export type TrendingSort =
  | 'galaxy_score'
  | 'alt_rank'
  | 'interactions_24h'
  | 'social_dominance'
  | 'sentiment'

export interface TrendingCoin {
  id: number | null
  symbol: string
  name: string
  logo: string | null
  price: number | null
  percent_change_24h: number | null
  market_cap: number | null
  market_cap_rank: number | null
  galaxy_score: number | null
  alt_rank: number | null
  sentiment: number | null
  social_dominance: number | null
  interactions_24h: number
}

export type TrendingStatus =
  | 'ok'
  | 'cached'
  | 'stale'
  | 'quota_exhausted'
  | 'unconfigured'
  | 'upstream_error'

export interface TrendingResult {
  status: TrendingStatus
  sort: TrendingSort
  count: number
  coins: TrendingCoin[]
  generated_at: string
  stale_reason?: string
  stale_age_seconds?: number
  message?: string
}

interface CacheEntry {
  data: Omit<TrendingResult, 'status' | 'stale_reason' | 'stale_age_seconds' | 'message'>
  ts: number
}

const cache = new Map<string, CacheEntry>()

export function normaliseSort(raw: unknown): TrendingSort {
  if (typeof raw !== 'string') return 'galaxy_score'
  const s = raw.trim().toLowerCase()
  return (VALID_SORTS.has(s) ? s : 'galaxy_score') as TrendingSort
}

export function clampLimit(raw: unknown, fallback = 20, max = 50): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), 1), max)
}

export interface FetchTrendingOpts {
  sort?: unknown
  limit?: unknown
  defaultLimit?: number
  maxLimit?: number
  fetchImpl?: typeof fetch
  apiKey?: string | null
  now?: () => Date
}

export async function fetchTrendingCoins(
  opts: FetchTrendingOpts = {}
): Promise<TrendingResult> {
  const sort = normaliseSort(opts.sort)
  const limit = clampLimit(opts.limit, opts.defaultLimit ?? 20, opts.maxLimit ?? 50)
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? (() => new Date())
  const apiKey = opts.apiKey ?? process.env.LUNARCRUSH_API_KEY ?? ''
  const cacheKey = `${sort}:${limit}`

  if (!apiKey) {
    return {
      status: 'unconfigured',
      sort,
      count: 0,
      coins: [],
      generated_at: now().toISOString(),
      message: 'LUNARCRUSH_API_KEY not configured on the server.',
    }
  }

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < HOT_TTL) {
    return { ...cached.data, status: 'cached' }
  }

  try {
    const res = await fetchImpl(`${LC_BASE}/public/coins/list/v1`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const isQuota = res.status === 429 || /rate limit|quota/i.test(body)
      const isDaily = /daily/i.test(body)
      if (cached && Date.now() - cached.ts < STALE_TTL) {
        return {
          ...cached.data,
          status: 'stale',
          stale_reason: isQuota
            ? `LunarCrush ${isDaily ? 'daily' : 'minute'} quota exhausted`
            : `LunarCrush ${res.status}`,
          stale_age_seconds: Math.round((Date.now() - cached.ts) / 1000),
        }
      }
      return {
        status: isQuota ? 'quota_exhausted' : 'upstream_error',
        sort,
        count: 0,
        coins: [],
        generated_at: now().toISOString(),
        message: isQuota
          ? `LunarCrush ${isDaily ? 'daily' : 'per-minute'} quota exhausted. Resets at 00:00 UTC.`
          : `LunarCrush returned ${res.status}.`,
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

    const coins: TrendingCoin[] = sorted.slice(0, limit).map((c: any) => ({
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
      sort,
      count: coins.length,
      coins,
      generated_at: now().toISOString(),
    }
    cache.set(cacheKey, { data: payload, ts: Date.now() })
    return { status: 'ok', ...payload }
  } catch (e: any) {
    if (cached && Date.now() - cached.ts < STALE_TTL) {
      return {
        ...cached.data,
        status: 'stale',
        stale_reason: e?.message || 'fetch failed',
        stale_age_seconds: Math.round((Date.now() - cached.ts) / 1000),
      }
    }
    return {
      status: 'upstream_error',
      sort,
      count: 0,
      coins: [],
      generated_at: now().toISOString(),
      message: e?.message || 'fetch failed',
    }
  }
}

export function __clearTrendingCacheForTests() {
  cache.clear()
}
