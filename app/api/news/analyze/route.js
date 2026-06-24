import { NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * POST /api/news/analyze
 *
 * ORCA's full "how it affected the market" walkthrough for a single news item.
 * Returns a short, structured, PLAIN-TEXT analysis (WHAT HAPPENED / MARKET IMPACT
 * / WHY / WHAT TO WATCH) grounded in the facts the client passes plus standard
 * market mechanics — never fabricating specific numbers/events not provided.
 *
 * Uses xAI/Grok (OpenAI-compatible) with an OpenAI fallback, cached per story.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const cache = new Map() // cacheKey -> { analysis, at }
const TTL = 60 * 60 * 1000 // 1h
const MAX_CACHE = 200

function trimCache() {
  if (cache.size <= MAX_CACHE) return
  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
  if (oldest) cache.delete(oldest[0])
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const title = String(body.title || '').slice(0, 300).trim()
    const description = String(body.description || '').slice(0, 900).trim()
    const source = String(body.source || '').slice(0, 80).trim()
    const token = String(body.token || '').slice(0, 12).toUpperCase().trim()
    const pct = Number(body.pct)
    const sentiment = String(body.sentiment || '').slice(0, 16).trim()

    if (!title) return NextResponse.json({ analysis: '' })

    const hasPct = Number.isFinite(pct)
    const pctStr = hasPct ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% over 24h` : 'n/a'
    const cacheKey = `${title}::${token}`

    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.at < TTL) {
      return NextResponse.json({ analysis: hit.analysis, cached: true })
    }

    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    let ai
    let model
    if (xaiKey) {
      ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
      model = 'grok-3-fast'
    } else if (openaiKey) {
      ai = new OpenAI({ apiKey: openaiKey })
      model = 'gpt-4o-mini'
    } else {
      return NextResponse.json({ analysis: '' })
    }

    const system =
      `You are ORCA, Sonar's crypto market analyst. Analyze the news item and walk the reader ` +
      `through how it has affected (or is likely to affect) the market. Ground every claim ONLY in ` +
      `the facts provided plus well-established market mechanics — never invent specific numbers, ` +
      `dates, names, or events that are not given. Professional Bloomberg-terminal tone: direct, ` +
      `concise, no hype, no emojis, no financial-advice disclaimers, no preamble.\n\n` +
      `Respond as PLAIN TEXT (no markdown, no asterisks) with EXACTLY these four labeled lines, each ` +
      `on its own line, each starting with the label in capitals followed by a colon and a space:\n` +
      `WHAT HAPPENED: <one sentence>\n` +
      `MARKET IMPACT: <2-3 sentences on the effect on ${token || 'the asset'} and the broader crypto market>\n` +
      `WHY: <the mechanism linking the news to price or flows, 1-2 sentences>\n` +
      `WHAT TO WATCH: <one forward-looking sentence>`

    const user =
      `Asset: ${token || 'n/a'} (${pctStr})\n` +
      `Headline: ${title}\n` +
      (description ? `Summary: ${description}\n` : '') +
      (source ? `Source: ${source}\n` : '') +
      (sentiment ? `Sentiment read: ${sentiment}\n` : '') +
      `\nWrite the analysis:`

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.45,
      max_tokens: 500,
    })

    const analysis = (completion?.choices?.[0]?.message?.content || '').trim()
    if (analysis) {
      cache.set(cacheKey, { analysis, at: Date.now() })
      trimCache()
    }
    return NextResponse.json({ analysis })
  } catch (e) {
    return NextResponse.json({ analysis: '' })
  }
}
