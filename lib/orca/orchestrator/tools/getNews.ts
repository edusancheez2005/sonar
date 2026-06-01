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
    // Fetch a broader candidate set: ILIKE %TICKER% over a CSV/JSON column
    // matches substrings (e.g. ticker `OP` hits headlines about "Op Sindoor"),
    // and short tickers also collide with English words (`IT`, `ON`, `IS`).
    // We refetch up to 4x the requested limit and post-filter to rows whose
    // related_tickers list contains the exact ticker, and (for ambiguous
    // short tickers) whose title/summary mentions a crypto-adjacent term or
    // the ticker with a `$` prefix / cashtag.
    const { data } = await supabase
      .from('news_articles')
      .select('title, url, source, published_at, summary, related_tickers')
      .ilike('related_tickers', `%${ticker}%`)
      .order('published_at', { ascending: false })
      .limit(Math.max(limit * 4, 20))

    const rows = Array.isArray(data) ? data : []
    const filtered = rows
      .filter((r: any) => {
        // If the row didn't carry related_tickers (older rows or test stubs),
        // trust the DB-level ILIKE that already matched it.
        if (r?.related_tickers == null) return true
        const tickers = parseTickers(r.related_tickers)
        if (!tickers.includes(ticker)) return false
        if (!AMBIGUOUS_SHORT_TICKERS.has(ticker)) return true
        // Extra disambiguation for collision-prone short tickers.
        const blob = `${r?.title ?? ''}\n${r?.summary ?? ''}`.toLowerCase()
        if (CRYPTO_TERMS_RE.test(blob)) return true
        if (blob.includes(`$${ticker.toLowerCase()}`)) return true
        return false
      })
      .slice(0, limit)

    return {
      ok: true,
      data: {
        ticker,
        items: filtered.map((r: any) => ({
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

// Tickers that frequently collide with English words / abbreviations / acronyms.
// For these we require either a crypto-adjacent term in the headline or an
// explicit cashtag (`$op`) match before surfacing the article.
const AMBIGUOUS_SHORT_TICKERS = new Set<string>([
  'OP', 'IT', 'ON', 'IS', 'AS', 'AT', 'BE', 'GO', 'NO', 'OR', 'SO', 'TO', 'UP',
  'AI', 'ID', 'IO', 'PI', 'WHY', 'WIN', 'WIF', 'GAS', 'OIL', 'CAT', 'DOG',
  'ONE', 'ALL', 'NEW', 'OLD', 'WAR', 'JOB', 'KEY', 'BIG', 'TOP', 'ACT',
])

const CRYPTO_TERMS_RE =
  /(crypto|blockchain|token|defi|nft|web3|layer[\s-]?2|l2|rollup|stablecoin|altcoin|wallet|exchange|onchain|on-chain|coinbase|binance|ethereum|bitcoin|solana|optimism|arbitrum|airdrop|staking|validator|smart contract)/i

function parseTickers(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x) => typeof x === 'string')
      .map((x: string) => x.trim().toUpperCase())
      .filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z0-9._-]{1,12}$/.test(s))
  }
  return []
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
