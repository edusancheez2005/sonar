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
import { waitUntil } from '@vercel/functions'
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
  /** The model's own overall verdict, kept for reference. overall_sentiment is
   *  DERIVED from the factors (deriveOverall) so the badge can never
   *  contradict the factors it summarises. */
  llm_overall_sentiment?: MacroImpact
  derived_from?: 'factors'
  counts?: { bullish: number; bearish: number; neutral: number }
  /** When the factors were generated (= app_cache.updated_at). */
  generated_at?: string
}

/** Badge rule: the side with more factors wins if it leads by 2 or more; otherwise neutral. */
export function deriveOverall(factors: Array<{ impact: MacroImpact }> | null | undefined): MacroImpact {
  const c = countImpacts(factors)
  const lead = c.bullish - c.bearish
  return lead >= 2 ? 'bullish' : lead <= -2 ? 'bearish' : 'neutral'
}

export function countImpacts(factors: Array<{ impact: MacroImpact }> | null | undefined) {
  const c = { bullish: 0, bearish: 0, neutral: 0 }
  for (const f of factors || []) c[f?.impact === 'bullish' || f?.impact === 'bearish' ? f.impact : 'neutral'] += 1
  return c
}

/** Apply the derived badge to any result, including cache rows written before 2026-10-25. */
export function withDerivedOverall(r: MacroFactorsResult, generatedAt?: string): MacroFactorsResult {
  return {
    ...r,
    llm_overall_sentiment: r.llm_overall_sentiment ?? r.overall_sentiment,
    overall_sentiment: deriveOverall(r.factors),
    derived_from: 'factors',
    counts: countImpacts(r.factors),
    generated_at: generatedAt ?? r.generated_at,
  }
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

// Last good result in this instance: a FALLBACK when regeneration fails, never
// served ahead of the shared app_cache row (that copy kept a 12 h-old badge
// alive per warm instance).
let cachedResult: MacroFactorsResult | null = null

// Shared cross-instance cache row (Supabase). In-memory cache alone is
// useless on serverless: every cold instance started empty and paid the full
// 30s+ Grok generation on a live user request.
const DB_CACHE_KEY = `macro_factors_${CACHE_VERSION}`
let inFlight: Promise<MacroFactorsResult> | null = null

function serviceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
    // Next 14 pins fetches made inside GET route handlers into the Data
    // Cache (even under `dynamic = 'force-dynamic'` — supabase-js calls fetch
    // in a way that dodges the segment default). Result observed in prod
    // 2026-07-20: /api/social/macro served the July-12 cache row for EIGHT
    // DAYS while the cron kept writing fresh rows — POST routes (ORCA chat)
    // read the same table and saw fresh data the whole time. Force no-store.
    global: {
      fetch: (url: any, opts: any) => fetch(url, { ...opts, cache: 'no-store' }),
    },
  })
}

async function readDbCache(): Promise<{ result: MacroFactorsResult; ageMs: number; updatedAt: string | null } | null> {
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
    const updatedAt = Number.isFinite(t) ? new Date(t).toISOString() : null
    return { result: { ...value, stale: false }, ageMs, updatedAt }
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
  try {
    const supabase = serviceClient()
    if (!supabase) return []
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
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (s === 'bullish' || s === 'bearish' || s === 'neutral') return s
  // 'Bearish', 'slightly bullish', 'bullish-leaning', 'mixed'… used to all
  // collapse to neutral, so a bearish factor could show a grey dot.
  let out: MacroImpact = 'neutral'
  if (/\bbull|positive|risk[- ]on/.test(s) && !/\bbear/.test(s)) out = 'bullish'
  else if (/\bbear|negative|risk[- ]off/.test(s) && !/\bbull/.test(s)) out = 'bearish'
  if (s) console.warn(`[macro] non-standard impact "${s}" → ${out}`)
  return out
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
  return withDerivedOverall({
    factors,
    overall_sentiment: coerceImpact(parsed?.overall_sentiment),
    last_updated: typeof parsed?.last_updated === 'string' ? parsed.last_updated : today,
    stale: false,
  }, new Date().toISOString())
}

/**
 * Fetch (or serve cached) live macro factors. Throws MacroUnavailableError on
 * a hard failure when there is no cached fallback available.
 */
export async function getMacroFactors(opts?: { forceRefresh?: boolean }): Promise<MacroFactorsResult> {
  if (!opts?.forceRefresh) {
    // The shared Supabase row on every request (cheap): every instance and
    // every consumer shows the same generation.
    const db = await readDbCache()
    if (db) {
      const derived = withDerivedOverall(db.result, db.updatedAt || undefined)
      cachedResult = derived
      // Even past-TTL data is served immediately (stale: true) — users never
      // wait on Grok. The refresh-macro cron owns regeneration, but it can
      // silently miss (2026-07-19 audit: prod served July-12 factors for six
      // days straight), so a stale read also kicks off a background
      // regeneration. Single-flight via `inFlight`; waitUntil keeps the
      // serverless instance alive past the response.
      const isStale = db.ageMs >= CACHE_TTL
      if (isStale && !inFlight) {
        inFlight = generateFresh().finally(() => { inFlight = null })
        const silenced = inFlight.catch(() => {})
        try {
          waitUntil(silenced)
        } catch {
          // non-Vercel runtime (tests, plain node): best-effort fire-and-forget
        }
      }
      return { ...derived, stale: isStale }
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
  await writeDbCache(result)
  return { ...result, stale: false }
}
