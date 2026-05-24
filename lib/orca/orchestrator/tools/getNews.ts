/**
 * Tool: getNews
 * =============================================================================
 * Returns the most recent headlines mentioning a ticker from `news_articles`.
 */
import type { SupabaseLike, ToolResult } from '../types'

const DEFAULT_LIMIT = 5

export interface GetNewsArgs {
  ticker?: unknown
  limit?: unknown
}

export async function run(
  args: GetNewsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return { ok: false, data: null, source: 'news_articles', fetched_at, error: 'invalid_ticker' }
  }

  const limit = clampLimit(args.limit)

  try {
    const { data } = await supabase
      .from('news_articles')
      .select('title, url, source, published_at, summary')
      .ilike('related_tickers', `%${ticker}%`)
      .order('published_at', { ascending: false })
      .limit(limit)

    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      data: {
        ticker,
        items: rows.map((r: any) => ({
          title: typeof r?.title === 'string' ? r.title.trim() : null,
          url: typeof r?.url === 'string' ? r.url : null,
          source: typeof r?.source === 'string' ? r.source : null,
          published_at: r?.published_at ?? null,
          summary: typeof r?.summary === 'string' ? r.summary.trim() : null,
        })),
      },
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

function clampLimit(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), 10)
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}
