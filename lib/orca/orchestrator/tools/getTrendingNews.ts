/**
 * Tool: getTrendingNews
 * =============================================================================
 * Market-wide latest crypto headlines. Unlike getNews (which needs a ticker),
 * this answers "what's the latest crypto news?" / "any big news today?" \u2014
 * no-ticker informational queries. Pulls the most recent rows from
 * `news_items` (the table the ingest-news cron actually writes to) ordered by
 * published_at, lightly de-duplicated by title.
 */
import type { SupabaseLike, ToolResult } from '../types'

const NEWS_TABLE = 'news_items'

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
  const nowMs = now().getTime()
  const windowCutoffMs = nowMs - LOOKBACK_HOURS * 60 * 60 * 1000

  try {
    // Fetch the newest headlines regardless of age, then prefer those inside
    // the freshness window. News ingestion runs only every ~12h and upstream
    // sources can lag, so a hard published_at filter would intermittently
    // return nothing. Falling back to the latest available rows (and flagging
    // staleness) keeps "what's the latest crypto news?" answerable.
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select('title, url, source, published_at, content, ticker')
      .order('published_at', { ascending: false })
      .limit(Math.max(limit * 4, 40))

    if (error) {
      return {
        ok: false,
        data: null,
        source: NEWS_TABLE,
        fetched_at,
        error: `query_failed: ${error.message || 'unknown'}`,
      }
    }

    const rows = Array.isArray(data) ? data : []
    const seen = new Set<string>()
    const deduped: Array<any> = []
    for (const r of rows as any[]) {
      const title = typeof r?.title === 'string' ? r.title.trim() : ''
      if (!title) continue
      const key = title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const summary = typeof r?.content === 'string' ? r.content.trim() : null
      deduped.push({
        title,
        url: typeof r?.url === 'string' ? r.url : null,
        source: typeof r?.source === 'string' ? r.source : null,
        published_at: r?.published_at ?? null,
        summary: summary ? summary.slice(0, 280) : null,
        related_tickers: parseTickers(r?.ticker).slice(0, 6),
      })
    }

    if (deduped.length === 0) {
      return {
        ok: false,
        data: null,
        source: NEWS_TABLE,
        fetched_at,
        error: 'no_recent_news',
      }
    }

    const publishedMs = (v: unknown): number => {
      const t = typeof v === 'string' || typeof v === 'number' ? new Date(v as any).getTime() : NaN
      return Number.isFinite(t) ? t : NaN
    }
    const inWindow = deduped.filter((r) => {
      const ms = publishedMs(r.published_at)
      return Number.isFinite(ms) && ms >= windowCutoffMs
    })
    const stale = inWindow.length === 0
    const items = (stale ? deduped : inWindow).slice(0, limit)

    const newestMs = items.reduce((acc, r) => {
      const ms = publishedMs(r.published_at)
      return Number.isFinite(ms) && ms > acc ? ms : acc
    }, -Infinity)
    const newestAgeHours = Number.isFinite(newestMs)
      ? Math.max(0, Math.round((nowMs - newestMs) / (60 * 60 * 1000)))
      : null

    return {
      ok: true,
      data: {
        window_hours: LOOKBACK_HOURS,
        count: items.length,
        stale,
        newest_age_hours: newestAgeHours,
        items,
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
