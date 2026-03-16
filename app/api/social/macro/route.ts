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
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export async function GET() {
  try {
    // Return cached if fresh
    if (cachedResult && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' }
      })
    }

    const xaiKey = process.env.XAI_API_KEY
    if (!xaiKey) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 })
    }

    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })

    const completion = await ai.chat.completions.create({
      model: 'grok-4-1-fast-non-reasoning',
      messages: [
        {
          role: 'system',
          content: `You are a concise crypto macro analyst. Return a JSON object with exactly this structure:
{
  "factors": [
    { "title": "short title", "impact": "bullish" or "bearish" or "neutral", "summary": "1-2 sentence explanation" }
  ],
  "overall_sentiment": "bullish" or "bearish" or "neutral",
  "last_updated": "human readable time"
}

Include exactly 5-7 factors covering:
1. Federal Reserve / interest rates / inflation
2. Geopolitical events (wars, sanctions, trade)
3. US crypto regulation / policy
4. ETF flows (BTC/ETH)
5. Major institutional moves (Saylor, BlackRock, etc.)
6. Market structure (BTC dominance, total market cap)
7. Any other major factor right now

Search the web and X for the LATEST information. Be specific with numbers and dates. Keep summaries under 30 words each. Return ONLY valid JSON, no markdown.`
        },
        {
          role: 'user',
          content: 'What are the key macro factors affecting the crypto market RIGHT NOW? Search for the latest data.'
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      // @ts-ignore - xAI specific
      search: { mode: 'on', max_search_results: 8 }
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
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' }
    })
  } catch (error) {
    console.error('Macro factors error:', error)
    return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
  }
}
