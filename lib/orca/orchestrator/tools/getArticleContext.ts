/**
 * Tool: getArticleContext (W3)
 * =============================================================================
 * Fetches a single news article (by id or by URL) plus its surrounding
 * context: source, publish time, summary, related tickers. Capped to the
 * last 30 days to avoid pulling stale items into the conversation.
 *
 * The renderer uses this to answer "explain this headline" / "what does
 * this article mean for $TICKER" without re-running the full overview.
 */
import type { SupabaseLike, ToolResult } from '../types'

const MAX_AGE_DAYS = 30

export interface GetArticleContextArgs {
  articleId?: unknown
  url?: unknown
}

function normaliseId(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v))
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s || s.length > 64) return null
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null
  return s
}

function normaliseUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s || s.length > 2048) return null
  if (!/^https?:\/\//i.test(s)) return null
  return s
}

export async function run(
  args: GetArticleContextArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const id = normaliseId(args.articleId)
  const url = normaliseUrl(args.url)
  if (!id && !url) {
    return {
      ok: false,
      data: null,
      source: 'news_articles',
      fetched_at,
      error: 'invalid_args',
    }
  }
  const cutoffIso = new Date(
    now().getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  try {
    let query = supabase
      .from('news_articles')
      .select('id, title, url, source, published_at, summary, related_tickers, sentiment_score')
      .gte('published_at', cutoffIso)
      .limit(1)
    if (id) query = query.eq('id', id)
    else if (url) query = query.eq('url', url)

    const { data } = await query
    const row = Array.isArray(data) ? data[0] : null
    if (!row) {
      return {
        ok: true,
        data: { found: false, reason: 'not_found_or_older_than_30d' },
        source: 'news_articles',
        fetched_at,
      }
    }
    return {
      ok: true,
      data: {
        found: true,
        id: row.id ?? null,
        headline: typeof row.title === 'string' ? row.title.trim() : null,
        source: typeof row.source === 'string' ? row.source : null,
        published_at: row.published_at ?? null,
        url: typeof row.url === 'string' ? row.url : null,
        excerpt: typeof row.summary === 'string' ? row.summary.trim().slice(0, 800) : null,
        sentiment_score:
          typeof row.sentiment_score === 'number' ? row.sentiment_score : null,
        related_tickers: parseTickers(row.related_tickers),
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

function parseTickers(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x) => typeof x === 'string')
      .map((x: string) => x.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z0-9._-]{1,12}$/.test(s))
      .slice(0, 20)
  }
  return []
}
