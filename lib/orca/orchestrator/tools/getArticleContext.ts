/**
 * Tool: getArticleContext (W3)
 * =============================================================================
 * Fetches a single news article (by id, by URL, or by title keywords) plus its
 * surrounding context: source, publish time, excerpt, ticker. Capped to the
 * last 30 days to avoid pulling stale items into the conversation.
 *
 * The renderer uses this to answer "explain this headline" / "what does
 * this article mean for $TICKER" without re-running the full overview.
 *
 * 2026-07-19 audit fix: this tool previously queried a `news_articles` table
 * that does not exist in production (the ingest cron writes to `news_items`),
 * so EVERY article lookup silently returned query_failed and ORCA answered
 * article questions with generic knowledge instead of the actual article.
 * It also only accepted url/articleId, while users overwhelmingly reference
 * articles by headline ("that CLARITY Act article") — hence `titleQuery`.
 */
import type { SupabaseLike, ToolResult } from '../types'

const MAX_AGE_DAYS = 30
const NEWS_TABLE = 'news_items'

export interface GetArticleContextArgs {
  articleId?: unknown
  url?: unknown
  /** Free-text headline keywords, e.g. "CLARITY Act altcoins". */
  titleQuery?: unknown
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

/**
 * Strip query string / fragment / trailing slash so a pasted link with UTM
 * params still matches the ingested canonical URL, and escape PostgREST
 * `like` wildcards in the remainder.
 */
function urlPrefixPattern(url: string): string {
  const base = url.split(/[?#]/)[0].replace(/\/+$/, '')
  return `${base.replace(/[%_]/g, '\\$&')}%`
}

function normaliseTitleQuery(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/["'`]/g, '')
  if (s.length < 3 || s.length > 200) return null
  return s
}

export async function run(
  args: GetArticleContextArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  let id = normaliseId(args.articleId)
  const url = normaliseUrl(args.url)
  let titleQuery = normaliseTitleQuery(args.titleQuery)
  // `news_items.id` is a uuid — a planner that passes a bare word ("CLARITY")
  // as articleId would make Postgres throw on the uuid cast. Reroute anything
  // that can't be an id into the title search instead of failing.
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    if (!titleQuery) titleQuery = normaliseTitleQuery(id)
    id = null
  }
  if (!id && !url && !titleQuery) {
    return {
      ok: false,
      data: null,
      source: NEWS_TABLE,
      fetched_at,
      error: 'invalid_args',
    }
  }
  const cutoffIso = new Date(
    now().getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  try {
    let query = supabase
      .from(NEWS_TABLE)
      .select('id, title, url, source, published_at, content, ticker, author, sentiment_raw')
      .gte('published_at', cutoffIso)
      .order('published_at', { ascending: false })
      .limit(1)
    if (id) query = query.eq('id', id)
    else if (url) query = query.ilike('url', urlPrefixPattern(url))
    else if (titleQuery) {
      // Match every keyword independently so word order doesn't matter
      // ("CLARITY Act altcoins" ↔ "Top 3 Altcoins … CLARITY Act Passes").
      const words = titleQuery.split(/\s+/).filter((w) => w.length >= 3).slice(0, 6)
      for (const w of words.length > 0 ? words : [titleQuery]) {
        query = query.ilike('title', `%${w.replace(/[%_]/g, '\\$&')}%`)
      }
    }

    const { data } = await query
    const row = Array.isArray(data) ? data[0] : null
    if (!row) {
      return {
        ok: true,
        data: { found: false, reason: 'not_found_or_older_than_30d' },
        source: NEWS_TABLE,
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
        author: typeof row.author === 'string' ? row.author : null,
        published_at: row.published_at ?? null,
        url: typeof row.url === 'string' ? row.url : null,
        excerpt: typeof row.content === 'string' ? row.content.trim().slice(0, 800) : null,
        sentiment_score:
          typeof row.sentiment_raw === 'number' ? row.sentiment_raw : null,
        related_tickers: parseTickers(row.ticker),
      },
      source: NEWS_TABLE,
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: NEWS_TABLE,
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
