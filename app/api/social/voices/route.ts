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
const CACHE_TTL = 30 * 60 * 1000 // 30 min — refresh frequently for breaking news

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === '1'

    if (!forceRefresh && cachedResult && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
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
          content: `You are a crypto intelligence analyst with real-time access to X/Twitter. TODAY IS ${today}.

Your job: find the ACTUAL, REAL, VERIFIED latest tweets and public statements from these people. Do NOT fabricate or guess quotes. Only return statements you can verify from X or news sources.

=== PRIORITY ACCOUNTS (search for ALL recent tweets/statements, not just crypto) ===
These people move crypto markets with ANY statement — geopolitics, trade wars, tariffs,
military action, sanctions, economic policy, energy, interest rates, AND crypto.
Find their MOST RECENT tweet or public statement regardless of topic.

${PRIORITY_ACCOUNTS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

=== CRYPTO INFLUENCERS (search for crypto/market-specific statements) ===
${CRYPTO_INFLUENCERS.map((p, i) => `${i + 1 + PRIORITY_ACCOUNTS.length}. ${p}`).join('\n')}

RULES:
- ONLY include REAL statements from the LAST 7 DAYS. Nothing older. Nothing fabricated.
- Prioritize the MOST RECENT statements first (today > yesterday > 2 days ago).
- For PRIORITY ACCOUNTS: include their most recent tweet/statement EVEN IF it is not about crypto.
  Geopolitical events (wars, sanctions, trade policy, tariffs, oil, peace deals) directly move BTC and crypto.
  Label the sentiment based on likely crypto market impact (e.g. military escalation = bearish, peace = bullish).
- For CRYPTO INFLUENCERS: only include crypto/market-relevant statements.
- If you CANNOT verify a recent statement for someone, SKIP THEM. Do not make up quotes.
- Return 6-12 entries maximum, sorted by date (most recent first).
- Each quote should be their ACTUAL words verbatim, or a very close paraphrase. Not your interpretation.
- Include the exact or approximate date of the statement.
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
      "context": "Brief 5-word context like 'On Bitcoin ETF inflows' or 'On ending Ukraine war'"
    }
  ],
  "last_updated": "${today}"
}

Return ONLY valid JSON. No markdown, no code blocks.`
        },
        {
          role: 'user',
          content: `Today is ${today}. Search X/Twitter and the web RIGHT NOW for the LATEST verified tweets and public statements from these people in the last 7 days:

PRIORITY (find their MOST RECENT tweet/statement, any topic — geopolitics, trade, military, crypto, economy, peace deals):
- Donald Trump (@realDonaldTrump) — check his latest Truth Social / X posts
- Jerome Powell — check latest Fed statements or press conferences
- SEC Chair — check latest SEC announcements
- Elon Musk (@elonmusk) — check his latest X posts
- Scott Bessent (Treasury Secretary) — check latest statements

CRYPTO INFLUENCERS (crypto/market statements only):
- Michael Saylor (@saylor), Vitalik Buterin (@VitalikButerin), CZ (@caborrowz), Cathie Wood (@CathieDWood), Larry Fink, Brian Armstrong (@brian_armstrong), Raoul Pal (@RaoulGMI), Arthur Hayes (@CryptoHayes)

Also include any breaking geopolitical statements from world leaders that would impact crypto (tariffs, sanctions, military action, energy policy, trade wars, peace negotiations).

IMPORTANT: Only return REAL, VERIFIED quotes. Skip anyone you can't find recent statements for.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      // @ts-ignore - xAI specific
      search: { mode: 'on', max_search_results: 30 }
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
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
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
