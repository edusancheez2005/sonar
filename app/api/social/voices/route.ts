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
const CACHE_TTL = 1 * 60 * 60 * 1000 // 1 hour — aggressive refresh for breaking geopolitical news

// Priority accounts: search ALL tweets (geopolitical, economic, anything) — these people move markets
const PRIORITY_ACCOUNTS = [
  'Donald Trump (US President, @realDonaldTrump)',
  'Jerome Powell (Federal Reserve Chair)',
  'Gary Gensler or current SEC Chair',
  'Elon Musk (@elonmusk)',
  'Scott Bessent (US Treasury Secretary)',
]

// Standard crypto influencers: search for crypto/market-specific statements
const CRYPTO_INFLUENCERS = [
  'Michael Saylor (MicroStrategy CEO, @saylor)',
  'Vitalik Buterin (Ethereum co-founder, @VitalikButerin)',
  'CZ / Changpeng Zhao (Binance founder, @caborrowz)',
  'Cathie Wood (ARK Invest CEO, @CathieDWood)',
  'Larry Fink (BlackRock CEO)',
  'Brian Armstrong (Coinbase CEO, @brian_armstrong)',
  'Raoul Pal (macro investor, @RaoulGMI)',
  'Arthur Hayes (BitMEX co-founder, @CryptoHayes)',
]

const ALL_INFLUENCERS = [...PRIORITY_ACCOUNTS, ...CRYPTO_INFLUENCERS]

export async function GET() {
  try {
    if (cachedResult && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }
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

Search X (Twitter), news, and the web for the most recent public statements from these people.

=== PRIORITY ACCOUNTS (search for ALL recent tweets/statements, not just crypto) ===
These people move crypto markets with ANY statement — geopolitics, trade wars, tariffs,
military action, sanctions, economic policy, energy, interest rates, AND crypto.
Always include their LATEST tweet or public statement regardless of topic.

${PRIORITY_ACCOUNTS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

=== CRYPTO INFLUENCERS (search for crypto/market-specific statements) ===
${CRYPTO_INFLUENCERS.map((p, i) => `${i + 1 + PRIORITY_ACCOUNTS.length}. ${p}`).join('\n')}

RULES:
- ONLY include statements from the LAST 14 DAYS. Nothing older.
- For PRIORITY ACCOUNTS: include their most recent tweet/statement EVEN IF it is not about crypto.
  Geopolitical events (wars, sanctions, trade policy, Strait of Hormuz, tariffs, oil) directly move BTC and crypto.
  Label the sentiment based on likely crypto market impact (e.g. military escalation = bearish).
- For CRYPTO INFLUENCERS: only include crypto/market-relevant statements.
- Return 6-12 entries maximum.
- Each quote should be their ACTUAL words or a very close paraphrase, not your interpretation.
- Include the approximate date of the statement.
- Classify sentiment as bullish, bearish, or neutral for crypto markets.

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
      "context": "Brief 5-word context like 'On Bitcoin ETF inflows' or 'On Strait of Hormuz tensions'"
    }
  ],
  "last_updated": "${today}"
}

Return ONLY valid JSON. No markdown, no code blocks.`
        },
        {
          role: 'user',
          content: `Today is ${today}. Search X/Twitter and the web for the LATEST tweets and public statements from these people in the last 14 days:

PRIORITY (find their MOST RECENT tweet, any topic — geopolitics, trade, military, crypto, economy):
- Donald Trump (@realDonaldTrump)
- Jerome Powell
- SEC Chair
- Elon Musk (@elonmusk)

CRYPTO INFLUENCERS (crypto/market statements only):
- Michael Saylor, Vitalik Buterin, CZ, Cathie Wood, Larry Fink, Brian Armstrong, Raoul Pal, Arthur Hayes

Include geopolitical statements from world leaders that would impact crypto markets (tariffs, sanctions, military action, energy policy, trade wars).`
        }
      ],
      temperature: 0.3,
      max_tokens: 1800,
      // @ts-ignore - xAI specific
      search: { mode: 'on', max_search_results: 25 }
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
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }
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
