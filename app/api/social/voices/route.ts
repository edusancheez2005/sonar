/**
 * Key Voices API — REAL DATA EDITION
 *
 * Pulls the most recent verified posts from priority creators directly out of
 * Supabase `social_posts` (which is populated by the LunarCrush ingestion job).
 *
 * Why no LLM for crypto voices?  Previous Grok-based implementation fabricated
 * quotes attributed to Trump / Musk / Powell because xAI's Live Search on Chat
 * Completions was deprecated and Grok answered from training data.  Real
 * LunarCrush posts can NEVER be hallucinated — they're actual tweets we already
 * pay to ingest.
 *
 * For political figures (Trump/Powell/Bessent/SEC) who don't appear in
 * crypto-focused LunarCrush data, we use the xAI Responses API
 * (`/v1/responses` with the `web_search` tool — the new, supported endpoint).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

let cachedResult: any = null
let cachedAt = 0
const CACHE_VERSION = 'v7-fix-url-column-2026-05-04'
let cachedVersion = ''
const CACHE_TTL = 30 * 60 * 1000 // 30 min

// LunarCrush handles → display metadata.  Order = display priority.
const CRYPTO_VOICES: Array<{ handle: string; name: string; role: string }> = [
  { handle: 'saylor',           name: 'Michael Saylor',  role: 'Strategy (MicroStrategy) — Executive Chairman' },
  { handle: 'VitalikButerin',   name: 'Vitalik Buterin', role: 'Ethereum co-founder' },
  { handle: 'cz_binance',       name: 'CZ',              role: 'Binance founder' },
  { handle: 'brian_armstrong',  name: 'Brian Armstrong', role: 'Coinbase CEO' },
  { handle: 'CryptoHayes',      name: 'Arthur Hayes',    role: 'BitMEX co-founder' },
  { handle: 'RaoulGMI',         name: 'Raoul Pal',       role: 'Real Vision CEO, macro investor' },
  { handle: 'CathieDWood',      name: 'Cathie Wood',     role: 'ARK Invest CEO' },
  { handle: 'APompliano',       name: 'Anthony Pompliano', role: 'Pomp Investments founder' },
  { handle: 'novogratz',        name: 'Mike Novogratz',  role: 'Galaxy Digital CEO' },
  { handle: 'BarrySilbert',     name: 'Barry Silbert',   role: 'DCG founder' },
]

// Macro / political figures — pulled via xAI web_search.
const POLITICAL_VOICES = [
  'Donald Trump (@realDonaldTrump) — US President',
  'Jerome Powell — Federal Reserve Chair',
  'Scott Bessent — US Treasury Secretary',
  'Elon Musk (@elonmusk)',
  'Current SEC Chair',
]

// Bump cache version so previous broken (empty) cache is discarded.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** LunarCrush sentiment is 1..5; map to bullish/neutral/bearish. */
function mapSentiment(raw: number | null | undefined): 'bullish' | 'bearish' | 'neutral' {
  if (raw == null || isNaN(raw)) return 'neutral'
  if (raw >= 3.6) return 'bullish'
  if (raw <= 2.4) return 'bearish'
  return 'neutral'
}

/** Trim a tweet to ~240 chars at a word boundary, strip trailing URLs. */
function trimQuote(body: string): string {
  if (!body) return ''
  let q = body.replace(/\s+https?:\/\/\S+\s*$/g, '').trim()
  if (q.length <= 240) return q
  const slice = q.slice(0, 237)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 180 ? slice.slice(0, lastSpace) : slice) + '…'
}

/** Format an ISO timestamp as "May 4, 2026". */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Build a short context label from the post body. */
function inferContext(body: string): string {
  const b = (body || '').toLowerCase()
  if (/etf|inflow|outflow|blackrock|fidelity|ibit|fbtc/.test(b)) return 'On ETF flows'
  if (/saylor|strategy.*acquired|microstrategy/.test(b)) return 'On Strategy treasury'
  if (/eth|ethereum|vitalik|layer\s?2|rollup/.test(b)) return 'On Ethereum'
  if (/sol\b|solana/.test(b)) return 'On Solana'
  if (/regulation|sec|cftc|congress|bill|legislation/.test(b)) return 'On regulation'
  if (/fed|powell|rate|inflation|cpi|fomc/.test(b)) return 'On macro / Fed'
  if (/tariff|trade war|china|geopolit/.test(b)) return 'On geopolitics'
  if (/whale|accumul|distribut/.test(b)) return 'On whale flows'
  if (/bull|rally|moon|ath|all.time/.test(b)) return 'Bullish call'
  if (/bear|crash|correction|dump|short/.test(b)) return 'Bearish call'
  if (/coinbase|exchange|listing/.test(b)) return 'On exchanges'
  return 'Latest post'
}

async function fetchCryptoVoicesFromDB() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('[voices] supabase env missing')
    return { voices: [], debug: { reason: 'env-missing' } }
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

  // 60-day window — top voices don't tweet daily.
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const debug: any = { tried: 0, matched: 0, errors: [] }
  const results = await Promise.all(
    CRYPTO_VOICES.map(async (v) => {
      debug.tried++
      const { data, error } = await supabase
        .from('social_posts')
        .select('body, published_at, sentiment, url, creator_screen_name')
        .ilike('creator_screen_name', v.handle)
        .gte('published_at', since)
        .not('body', 'is', null)
        .order('published_at', { ascending: false })
        .limit(1)
      if (error) {
        debug.errors.push(`${v.handle}: ${error.message}`)
        return null
      }
      const post: any = data?.[0]
      if (!post?.body) return null
      debug.matched++
      return {
        name: v.name,
        handle: '@' + v.handle,
        role: v.role,
        quote: trimQuote(post.body),
        date: formatDate(post.published_at),
        sentiment: mapSentiment(post.sentiment),
        context: inferContext(post.body),
        url: post.url || null,
        _published: post.published_at,
      }
    })
  )

  const out = results.filter((r): r is NonNullable<typeof r> => r !== null)
  console.log(`[voices] crypto matched: ${debug.matched} of ${debug.tried}; errors: ${debug.errors.length}`)
  return { voices: out, debug }
}

async function fetchPoliticalVoicesFromGrok() {
  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) return []

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const prompt = `Today is ${today}. Search the web and X for the most recent VERIFIED public statements (last 7 days) from these people that could affect crypto markets:

${POLITICAL_VOICES.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Topics that count: tariffs, sanctions, military action, Fed rate decisions, CPI/inflation, executive orders, SEC enforcement, crypto regulation, energy policy, trade deals, Treasury actions.

Return ONLY a JSON object — no prose, no code fences:
{
  "voices": [
    {
      "name": "Full Name",
      "handle": "@handle or empty",
      "role": "their title",
      "quote": "actual or close-paraphrased statement, max 2 sentences",
      "date": "May 4, 2026",
      "sentiment": "bullish" | "bearish" | "neutral",
      "context": "5-word context"
    }
  ]
}

Rules:
- Only include people you can verify a real statement for in the last 7 days. Skip the rest.
- Quote must be their actual words or a very close paraphrase.
- Sentiment = likely impact on crypto markets (military escalation = bearish; rate cut = bullish; etc.)
- Max 5 entries.`

  try {
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
      signal: AbortSignal.timeout(22_000),
    })
    if (!resp.ok) {
      console.warn('[voices] xAI responses non-OK:', resp.status, await resp.text().catch(() => ''))
      return []
    }
    const json: any = await resp.json()
    let text = ''
    for (const item of json.output || []) {
      if (item?.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c?.type === 'output_text' && typeof c.text === 'string') text += c.text
        }
      }
    }
    if (!text) return []
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end < 0) return []
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(parsed?.voices) ? parsed.voices : []
  } catch (e: any) {
    console.warn('[voices] political voices fetch failed:', e?.message || e)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === '1'

    if (!forceRefresh && cachedResult && cachedVersion === CACHE_VERSION && (Date.now() - cachedAt) < CACHE_TTL) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
      })
    }

    const [cryptoRes, political] = await Promise.all([
      fetchCryptoVoicesFromDB().catch(e => { console.warn('[voices] crypto db failed:', e?.message); return { voices: [], debug: { error: String(e?.message || e) } } }),
      fetchPoliticalVoicesFromGrok().catch(e => { console.warn('[voices] political failed:', e?.message); return [] }),
    ])
    const crypto = cryptoRes.voices

    const politicalNorm = political.map((p: any) => ({
      ...p,
      _published: (() => {
        const d = new Date(p.date || '')
        return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
      })(),
    }))

    // Political first (bigger market movers), then crypto sorted by recency within each.
    const politicalSorted = politicalNorm.sort((a: any, b: any) =>
      new Date(b._published).getTime() - new Date(a._published).getTime())
    const cryptoSorted = crypto.sort((a: any, b: any) =>
      new Date(b._published).getTime() - new Date(a._published).getTime())

    const merged = [...politicalSorted, ...cryptoSorted]
    const voices = merged.map(({ _published, ...rest }: any) => rest).slice(0, 12)

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const result = { voices, last_updated: today }

    cachedResult = result
    cachedAt = Date.now()
    cachedVersion = CACHE_VERSION

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (error: any) {
    console.error('Key voices error:', error?.message || error)
    if (cachedResult) {
      return NextResponse.json(cachedResult, { headers: { 'Cache-Control': 's-maxage=300' } })
    }
    return NextResponse.json({ error: 'Failed to fetch key voices' }, { status: 500 })
  }
}
// trigger deploy 20260504122210
