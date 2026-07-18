/**
 * Shared macro-factors core (§5.1 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md).
 * =============================================================================
 * ONE macro brain. Both the `/api/social/macro` route AND the ORCA
 * `getMacroFactors` tool call this, so the macro panel and ORCA always share a
 * single source (and a single 12h cache) instead of the tool self-HTTPing the
 * route from inside a serverless function.
 *
 * Uses the xAI Responses API (`/v1/responses`) with the `web_search` tool, and
 * seeds the prompt with the freshest `news_items` headlines we already store so
 * the model has real grounding even if web_search returns weak results.
 *
 * Never fabricates: on a hard upstream failure with no cached data it throws
 * `MacroUnavailableError`; callers translate that into an honest "unavailable"
 * message. When a previous good result is cached it is returned with
 * `stale: true` rather than erroring.
 */
import { createClient } from '@supabase/supabase-js'
import { getGlobalData, type GlobalMarketData } from '@/lib/coingecko/client'

export type MacroImpact = 'bullish' | 'bearish' | 'neutral'

export interface MacroFactor {
  title: string
  impact: MacroImpact
  summary: string
}

export interface MacroFactorsResult {
  factors: MacroFactor[]
  overall_sentiment: MacroImpact
  last_updated: string
  /** Authoritative market-structure numbers from CoinGecko /global —
   *  present when the fetch succeeded at generation time. */
  market?: GlobalMarketData
  /** True when the data is served from cache past its freshness window
   *  (upstream refresh failed) — callers should note it may be a little behind. */
  stale: boolean
}

export class MacroUnavailableError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.name = 'MacroUnavailableError'
    this.code = code
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

const CACHE_VERSION = 'v4-cg-global-2026-07-12'
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

let cachedResult: MacroFactorsResult | null = null
let cachedAt = 0
let cachedVersion = ''

// Shared cross-instance cache row (Supabase). In-memory cache alone is
// useless on serverless: every cold instance started empty and paid the full
// 30s+ Grok generation on a live user request.
const DB_CACHE_KEY = `macro_factors_${CACHE_VERSION}`
let inFlight: Promise<MacroFactorsResult> | null = null

function serviceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
}

async function readDbCache(): Promise<{ result: MacroFactorsResult; ageMs: number } | null> {
  const supabase = serviceClient()
  if (!supabase) return null
  try {
    const { data } = await supabase
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', DB_CACHE_KEY)
      .maybeSingle()
    const value = data?.value as MacroFactorsResult | undefined
    if (!value || !Array.isArray(value.factors) || value.factors.length === 0) return null
    const t = new Date(data!.updated_at).getTime()
    const ageMs = Number.isFinite(t) ? Date.now() - t : 0
    return { result: { ...value, stale: false }, ageMs }
  } catch {
    // Table missing or transient error — behave like no cache.
    return null
  }
}

async function writeDbCache(result: MacroFactorsResult): Promise<void> {
  const supabase = serviceClient()
  if (!supabase) return
  try {
    await supabase.from('app_cache').upsert({
      key: DB_CACHE_KEY,
      value: result,
      updated_at: new Date().toISOString(),
    })
  } catch {
    /* cache write is best-effort */
  }
}

async function fetchRecentHeadlines(): Promise<string[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return []
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    })
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('news_items')
      .select('title, source, published_at')
      .gte('published_at', since)
      .neq('title', 'Untitled')
      .not('title', 'is', null)
      .order('published_at', { ascending: false })
      .limit(40)
    if (!data) return []
    return data
      .filter((n: any) => n.title)
      .map((n: any) => `- [${n.source || 'news'}] ${n.title} (${(n.published_at || '').slice(0, 10)})`)
  } catch {
    return []
  }
}

function coerceImpact(v: unknown): MacroImpact {
  return v === 'bullish' || v === 'bearish' || v === 'neutral' ? v : 'neutral'
}

function normaliseResult(parsed: any, today: string): MacroFactorsResult {
  const rawFactors = Array.isArray(parsed?.factors) ? parsed.factors : []
  const factors: MacroFactor[] = rawFactors
    .map((f: any) => ({
      title: typeof f?.title === 'string' ? f.title : '',
      impact: coerceImpact(f?.impact),
      summary: typeof f?.summary === 'string' ? f.summary : '',
    }))
    .filter((f: MacroFactor) => f.title && f.summary)
  return {
    factors,
    overall_sentiment: coerceImpact(parsed?.overall_sentiment),
    last_updated: typeof parsed?.last_updated === 'string' ? parsed.last_updated : today,
    stale: false,
  }
}

/**
 * Fetch (or serve cached) live macro factors. Throws MacroUnavailableError on
 * a hard failure when there is no cached fallback available.
 */
export async function getMacroFactors(opts?: { forceRefresh?: boolean }): Promise<MacroFactorsResult> {
  if (!opts?.forceRefresh) {
    // Fresh in-memory hit (same warm instance).
    if (cachedResult && cachedVersion === CACHE_VERSION && Date.now() - cachedAt < CACHE_TTL) {
      return { ...cachedResult, stale: false }
    }
    // Shared Supabase cache: cold instances answer instantly from here.
    const db = await readDbCache()
    if (db) {
      cachedResult = db.result
      cachedAt = Date.now() - db.ageMs
      cachedVersion = CACHE_VERSION
      // Even past-TTL data is served immediately (stale: true) — the
      // refresh-macro cron owns regeneration; users never wait on Grok.
      return { ...db.result, stale: db.ageMs >= CACHE_TTL }
    }
    // No cache anywhere (first ever run): generate synchronously below.
  }
  if (inFlight) return inFlight
  inFlight = generateFresh().finally(() => { inFlight = null })
  return inFlight
}

async function generateFresh(): Promise<MacroFactorsResult> {
  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) {
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_unconfigured')
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const headlines = await fetchRecentHeadlines()
  const headlinesBlock = headlines.length
    ? `\n\nFor grounding, here are the most recent crypto headlines we have ingested in the last 7 days:\n${headlines
        .slice(0, 30)
        .join('\n')}\n\nUse these AS A STARTING POINT but ALSO search the web for anything more recent.`
    : ''

  // Authoritative market-structure numbers from CoinGecko /global. Grounds
  // the "market structure" factor with exact figures instead of making the
  // model search the web for (and occasionally misquote) them. Best-effort:
  // macro generation must not fail because CoinGecko hiccuped.
  let market: GlobalMarketData | undefined
  try {
    market = await getGlobalData()
  } catch (err: any) {
    console.warn('[macro] CoinGecko /global unavailable:', err?.message || err)
  }
  const fmtT = (v: number | null) => (v != null ? `$${(v / 1e12).toFixed(2)}T` : 'n/a')
  const fmtB = (v: number | null) => (v != null ? `$${(v / 1e9).toFixed(0)}B` : 'n/a')
  const fmtPct = (v: number | null) => (v != null ? `${v.toFixed(1)}%` : 'n/a')
  const marketBlock = market && market.total_market_cap_usd != null
    ? `\n\nVERIFIED market-structure data as of right now (from CoinGecko — use these exact figures for any market-structure factor; do NOT search the web for these numbers):
- Total crypto market cap: ${fmtT(market.total_market_cap_usd)} (${fmtPct(market.market_cap_change_percentage_24h_usd)} in 24h)
- BTC dominance: ${fmtPct(market.btc_dominance_pct)} | ETH dominance: ${fmtPct(market.eth_dominance_pct)}
- Total 24h volume: ${fmtB(market.total_volume_24h_usd)}`
    : ''

  const prompt = `Today is ${today}.

You are a concise crypto macro analyst. Search the web RIGHT NOW for the most important macro factors affecting crypto markets in the last 7 days.

Cover these areas (only include a factor if you find real, recent data — skip otherwise):
1. Federal Reserve: latest rate decision, CPI/PPI data, Fed commentary
2. Geopolitical: wars, sanctions, trade tensions, tariffs, peace deals
3. US crypto regulation: SEC/CFTC actions, legislation, executive orders
4. ETF flows: BTC/ETH ETF inflows/outflows
5. Institutional moves: MicroStrategy/Strategy, BlackRock, corporate buys
6. Market structure: BTC dominance, total crypto market cap, stablecoin supply
7. Any breaking macro event from the last 48 hours${headlinesBlock}${marketBlock}

Return ONLY a valid JSON object — no prose, no markdown fences:
{
  "factors": [
    { "title": "short title (max 6 words)", "impact": "bullish" | "bearish" | "neutral", "summary": "1-2 sentence explanation with a specific date from this week" }
  ],
  "overall_sentiment": "bullish" | "bearish" | "neutral",
  "last_updated": "${today}"
}

Rules:
- Include 5-7 factors total. MUST include at least one bearish or neutral factor unless the entire week is genuinely uniformly bullish.
- Every factor MUST reference a specific date within the last 7 days.
- If you can't find recent data for an area, omit it. Never fabricate.
- Keep summaries under 30 words.`

  let resp: Response
  try {
    resp = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Flagship (not mini): drives the web_search agentic tool.
        // grok-4-fast-* IDs are retired from xAI's current docs.
        model: process.env.ORCA_GROK_MODEL || 'grok-4.5',
        input: prompt,
        tools: [{ type: 'web_search' }],
      }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (err: any) {
    console.error('[macro] xAI fetch failed:', err?.message || err)
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_upstream_error')
  }

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '')
    console.error('[macro] xAI responses non-OK:', resp.status, errBody)
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_upstream_error')
  }

  const json: any = await resp.json()

  // Extract assistant text from output[]
  let raw = ''
  for (const item of json.output || []) {
    if (item?.content && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === 'output_text' && typeof c.text === 'string') raw += c.text
      }
    }
  }

  let parsed: any
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end < 0) throw new Error('no json object found')
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    console.warn('[macro] failed to parse JSON')
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_parse_error')
  }

  const result = normaliseResult(parsed, today)
  if (market) result.market = market
  if (result.factors.length === 0) {
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_empty')
  }

  cachedResult = result
  cachedAt = Date.now()
  cachedVersion = CACHE_VERSION
  await writeDbCache(result)
  return { ...result, stale: false }
}
