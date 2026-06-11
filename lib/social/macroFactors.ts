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

const CACHE_VERSION = 'v3-responses-web_search-2026-05-04'
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

let cachedResult: MacroFactorsResult | null = null
let cachedAt = 0
let cachedVersion = ''

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
export async function getMacroFactors(): Promise<MacroFactorsResult> {
  // Fresh cache hit.
  if (cachedResult && cachedVersion === CACHE_VERSION && Date.now() - cachedAt < CACHE_TTL) {
    return { ...cachedResult, stale: false }
  }

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

  const prompt = `Today is ${today}.

You are a concise crypto macro analyst. Search the web RIGHT NOW for the most important macro factors affecting crypto markets in the last 7 days.

Cover these areas (only include a factor if you find real, recent data — skip otherwise):
1. Federal Reserve: latest rate decision, CPI/PPI data, Fed commentary
2. Geopolitical: wars, sanctions, trade tensions, tariffs, peace deals
3. US crypto regulation: SEC/CFTC actions, legislation, executive orders
4. ETF flows: BTC/ETH ETF inflows/outflows
5. Institutional moves: MicroStrategy/Strategy, BlackRock, corporate buys
6. Market structure: BTC dominance, total crypto market cap, stablecoin supply
7. Any breaking macro event from the last 48 hours${headlinesBlock}

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
        model: 'grok-4-fast-reasoning',
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
  if (result.factors.length === 0) {
    if (cachedResult) return { ...cachedResult, stale: true }
    throw new MacroUnavailableError('macro_empty')
  }

  cachedResult = result
  cachedAt = Date.now()
  cachedVersion = CACHE_VERSION
  return { ...result, stale: false }
}
