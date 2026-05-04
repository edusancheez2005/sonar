/**
 * Macro Factors API — REAL DATA EDITION
 *
 * Uses the xAI Responses API (`/v1/responses`) with the `web_search` tool — the
 * NEW supported endpoint for live web search.  The previous Chat Completions
 * `search_parameters` shape is deprecated (returns 410 Gone), which is why this
 * endpoint was 500ing.
 *
 * To prevent fabrication we also seed the prompt with the latest fresh news
 * headlines we already store in Supabase, so even if web_search returns weak
 * results the model has real grounding.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let cachedResult: any = null
let cachedAt = 0
const CACHE_VERSION = 'v3-responses-web_search-2026-05-04'
let cachedVersion = ''
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

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
  } catch (e) {
    return []
  }
}

export async function GET() {
  try {
    if (cachedResult && cachedVersion === CACHE_VERSION && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' },
      })
    }

    const xaiKey = process.env.XAI_API_KEY
    if (!xaiKey) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 })
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const headlines = await fetchRecentHeadlines()
    const headlinesBlock = headlines.length
      ? `\n\nFor grounding, here are the most recent crypto headlines we have ingested in the last 7 days:\n${headlines.slice(0, 30).join('\n')}\n\nUse these AS A STARTING POINT but ALSO search the web for anything more recent.`
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

    const resp = await fetch('https://api.x.ai/v1/responses', {
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

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      console.error('[macro] xAI responses non-OK:', resp.status, errBody)
      if (cachedResult) {
        return NextResponse.json(cachedResult, { headers: { 'Cache-Control': 's-maxage=300' } })
      }
      return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
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
    } catch (e) {
      console.warn('[macro] failed to parse JSON, using fallback')
      parsed = {
        factors: [{
          title: 'Analysis Updating',
          impact: 'neutral',
          summary: 'Macro analysis is being refreshed. Check back in a few minutes.',
        }],
        overall_sentiment: 'neutral',
        last_updated: today,
      }
    }

    cachedResult = parsed
    cachedAt = Date.now()
    cachedVersion = CACHE_VERSION

    return NextResponse.json(parsed, {
      headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' },
    })
  } catch (error: any) {
    console.error('Macro factors error:', error?.message || error)
    if (cachedResult) {
      return NextResponse.json(cachedResult, { headers: { 'Cache-Control': 's-maxage=300' } })
    }
    return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
  }
}
