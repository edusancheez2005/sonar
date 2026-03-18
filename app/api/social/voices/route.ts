/**
 * Key Voices API
 * Returns AI-generated summaries of recent crypto statements from top influencers
 * Uses Grok with web search to find latest takes from famous people
 * Cached for 4 hours
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

let cachedResult: any = null
let cachedAt = 0
const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

const INFLUENCERS = [
  'Michael Saylor (MicroStrategy CEO, @saylor)',
  'Elon Musk (@elonmusk)',
  'Vitalik Buterin (Ethereum co-founder, @VitalikButerin)',
  'CZ / Changpeng Zhao (Binance founder, @caborrowz)',
  'Cathie Wood (ARK Invest CEO, @CathieDWood)',
  'Larry Fink (BlackRock CEO)',
  'Brian Armstrong (Coinbase CEO, @brian_armstrong)',
  'Raoul Pal (macro investor, @RaoulGMI)',
  'Arthur Hayes (BitMEX co-founder, @CryptoHayes)',
  'Donald Trump (US President, @realDonaldTrump)',
  'Jerome Powell (Federal Reserve Chair)',
  'Gary Gensler or current SEC Chair',
]

export async function GET() {
  try {
    if (cachedResult && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=14400, stale-while-revalidate=28800' }
      })
    }

    const xaiKey = process.env.XAI_API_KEY
    if (!xaiKey) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 })
    }

    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const completion = await ai.chat.completions.create({
      model: 'grok-3-fast',
      messages: [
        {
          role: 'system',
          content: `You are a crypto intelligence analyst. TODAY IS ${today}.

Search X (Twitter), news, and the web for the most recent public statements about crypto, Bitcoin, blockchain, or related financial markets from these people:

${INFLUENCERS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

RULES:
- ONLY include statements from the LAST 14 DAYS. Nothing older.
- Prioritize: US President, Fed Chair, SEC Chair, then billionaires/CEOs, then crypto founders
- If someone has NOT made a crypto-relevant statement in the last 14 days, SKIP them
- Return 6-10 entries maximum (only people who actually said something recently)
- Each quote should be their ACTUAL words or a very close paraphrase, not your interpretation
- Include the approximate date of the statement
- Classify sentiment as bullish, bearish, or neutral for crypto markets

Return ONLY valid JSON with this structure:
{
  "voices": [
    {
      "name": "Full Name",
      "handle": "@twitterhandle",
      "role": "Their title/role",
      "quote": "Their actual statement or close paraphrase, max 2 sentences",
      "date": "Mar 15, 2026",
      "sentiment": "bullish" or "bearish" or "neutral",
      "context": "Brief 5-word context like 'On Bitcoin ETF inflows' or 'On Fed rate decision'"
    }
  ],
  "last_updated": "${today}"
}

Return ONLY valid JSON. No markdown, no code blocks.`
        },
        {
          role: 'user',
          content: `Today is ${today}. Search X/Twitter and the web for the latest crypto-related public statements from major world leaders, billionaires, and crypto influencers in the last 14 days. Only include people who actually said something recently about crypto, Bitcoin, blockchain, or financial markets that affect crypto.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1200,
      // @ts-ignore - xAI specific
      search: { mode: 'on', max_search_results: 15 }
    })

    const raw = completion.choices[0]?.message?.content || ''

    let parsed
    try {
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = {
        voices: [{ name: 'Updating', handle: '', role: '', quote: 'Key voices are being refreshed. Check back shortly.', date: today, sentiment: 'neutral', context: 'Refreshing data' }],
        last_updated: today
      }
    }

    cachedResult = parsed
    cachedAt = Date.now()

    return NextResponse.json(parsed, {
      headers: { 'Cache-Control': 's-maxage=14400, stale-while-revalidate=28800' }
    })
  } catch (error) {
    console.error('Key voices error:', error)
    if (cachedResult) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=300' }
      })
    }
    return NextResponse.json({ error: 'Failed to fetch key voices' }, { status: 500 })
  }
}
