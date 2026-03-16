/**
 * Macro Factors API
 * Returns AI-generated summary of key factors affecting crypto right now
 * Uses a cheaper Grok model for cost efficiency
 * Cached for 15 minutes
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let cachedResult = null
let cachedAt = 0
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

export async function GET() {
  try {
    // Return cached if fresh
    if (cachedResult && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' }
      })
    }

    const xaiKey = process.env.XAI_API_KEY
    if (!xaiKey) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 })
    }

    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const completion = await ai.chat.completions.create({
      model: 'grok-4-1-fast-non-reasoning',
      messages: [
        {
          role: 'system',
          content: `You are a concise crypto macro analyst. TODAY'S DATE IS ${today}. 

CRITICAL: ALL data must be from the LAST 7 DAYS. Do NOT include any events from 2024 or earlier. Every date you mention must be within the last week. If you cannot find recent data for a factor, say "no recent update" instead of citing old data.

Return a JSON object with exactly this structure:
{
  "factors": [
    { "title": "short title", "impact": "bullish" or "bearish" or "neutral", "summary": "1-2 sentence explanation with specific dates from this week" }
  ],
  "overall_sentiment": "bullish" or "bearish" or "neutral",
  "last_updated": "${today}"
}

Include exactly 5-7 factors. Search the web for data from THIS WEEK ONLY about:
1. Federal Reserve: latest rate decision, CPI/PPI data, Fed commentary from this week
2. Geopolitical: current wars, sanctions, trade tensions as of today
3. US crypto regulation: any SEC/CFTC actions, legislation, executive orders this week
4. ETF flows: BTC/ETH ETF inflows/outflows from the last 7 days
5. Institutional moves: MicroStrategy, BlackRock, corporate buys THIS WEEK
6. Market structure: current BTC dominance, total crypto market cap as of today
7. Any breaking macro event from the last 48 hours

Keep summaries under 30 words each. Return ONLY valid JSON, no markdown.`
        },
        {
          role: 'user',
          content: `Today is ${today}. What are the key macro factors affecting the crypto market THIS WEEK? Only include events and data from the last 7 days. Search the web for the most recent information.`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      // @ts-ignore - xAI specific
      search: { mode: 'on', max_search_results: 10 }
    })

    const raw = completion.choices[0]?.message?.content || ''
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed
    try {
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      // If JSON parsing fails, return a fallback
      parsed = {
        factors: [{ title: 'Analysis Updating', impact: 'neutral', summary: 'Macro analysis is being refreshed. Check back in a few minutes.' }],
        overall_sentiment: 'neutral',
        last_updated: new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
      }
    }

    cachedResult = parsed
    cachedAt = Date.now()

    return NextResponse.json(parsed, {
      headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' }
    })
  } catch (error) {
    console.error('Macro factors error:', error)
    return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
  }
}
