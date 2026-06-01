/**
 * Tool: getTrendingNews
 * =============================================================================
 * Market-wide latest crypto headlines. Unlike getNews (which needs a ticker),
 * this answers "what's the latest crypto news?" / "any big news today?" \u2014
 * no-ticker informational queries. Pulls the most recent rows from
 * `news_articles` ordered by published_at, lightly de-duplicated by title.
 */
import type { SupabaseLike, ToolResult } from '../types'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 15
const LOOKBACK_HOURS = 72

export interface GetTrendingNewsArgs {
  limit?: unknown
}

export async function run(
  args: GetTrendingNewsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const limit = clampLimit(args.limit)
  const sinceIso = new Date(now().getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('title, url, source, published_at, summary, related_tickers')
      .gte('published_at', sinceIso)
      .order('published_at', { ascending: false })
      .limit(Math.max(limit * 3, 30))

    if (error) {
      return {
        ok: false,
        data: null,
        source: 'news_articles',
        fetched_at,
        error: `query_failed: ${error.message || 'unknown'}`,
      }
    }

    const rows = Array.isArray(data) ? data : []
    const seen = new Set<string>()
    const items: Array<any> = []
    for (const r of rows as any[]) {
      const title = typeof r?.title === 'string' ? r.title.trim() : ''
      if (!title) continue
      const key = title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        title,
        url: typeof r?.url === 'string' ? r.url : null,
        source: typeof r?.source === 'string' ? r.source : null,
        published_at: r?.published_at ?? null,
        summary: typeof r?.summary === 'string' ? r.summary.trim() : null,
        related_tickers: parseTickers(r?.related_tickers).slice(0, 6),
      })
      if (items.length >= limit) break
    }

    if (items.length === 0) {
      return {
        ok: false,
        data: null,
        source: 'news_articles',
        fetched_at,
        error: 'no_recent_news',
      }
    }

    return {
      ok: true,
      data: { window_hours: LOOKBACK_HOURS, count: items.length, items },
      source: 'news_articles',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'news_articles',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function clampLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT)
}

function parseTickers(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).toUpperCase().trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;|]/)
      .map((t) => t.toUpperCase().trim())
      .filter(Boolean)
  }
  return []
}
