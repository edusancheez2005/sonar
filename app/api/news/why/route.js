import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

/**
 * POST /api/news/why
 *
 * Generates ORCA's "why it moved" explanation for the breaking-news hero: one or
 * two sentences linking the headline to the asset's price action, grounded ONLY
 * in the facts the client passes (headline, summary, source, token, 24h move,
 * sentiment, relevant macro backdrop). Never fabricates numbers or events.
 *
 * Uses xAI/Grok (OpenAI-compatible) with an OpenAI fallback. Result is cached
 * in-memory per story so we don't re-bill the model on every poll/visit.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const cache = new Map() // cacheKey -> { why, at }
const TTL = 60 * 60 * 1000 // 1h
const MAX_CACHE = 200

function trimCache() {
  if (cache.size <= MAX_CACHE) return
  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
  if (oldest) cache.delete(oldest[0])
}

// Shared copy behind the per-instance cache: one app_cache row holding the
// newest explanations, so each story is billed once, not once per instance.
const SHARED_KEY = 'news_why_cache'
const SHARED_MAX = 100

async function readShared() {
  try {
    const { data } = await supabaseAdminFresh
      .from('app_cache')
      .select('value')
      .eq('key', SHARED_KEY)
      .maybeSingle()
    const entries = data?.value?.entries
    return entries && typeof entries === 'object' ? entries : {}
  } catch {
    return {}
  }
}

async function writeShared(entries) {
  const newest = Object.entries(entries)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, SHARED_MAX)
  try {
    await supabaseAdminFresh
      .from('app_cache')
      .upsert(
        { key: SHARED_KEY, value: { entries: Object.fromEntries(newest) }, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
  } catch {
    /* best-effort */
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const title = String(body.title || '').slice(0, 300).trim()
    const description = String(body.description || '').slice(0, 600).trim()
    const source = String(body.source || '').slice(0, 80).trim()
    const token = String(body.token || '').slice(0, 12).toUpperCase().trim()
    const pct = Number(body.pct)
    const sentiment = String(body.sentiment || '').slice(0, 16).trim()
    const macro = String(body.macro || '').slice(0, 400).trim()

    if (!title) return NextResponse.json({ why: '' })

    const hasPct = Number.isFinite(pct)
    const pctStr = hasPct ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% over 24h` : 'roughly flat'
    const cacheKey = `${title}::${token}::${hasPct ? (pct >= 0 ? 'up' : 'down') : 'na'}`

    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.at < TTL) {
      return NextResponse.json({ why: hit.why, cached: true })
    }
    const shared = await readShared()
    const sharedHit = shared[cacheKey]
    if (sharedHit && Date.now() - sharedHit.at < TTL) {
      cache.set(cacheKey, sharedHit)
      trimCache()
      return NextResponse.json({ why: sharedHit.why, cached: true })
    }

    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    let ai
    let model
    if (xaiKey) {
      ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
      // Non-reasoning: two grounded sentences don't need grok-4.3's billed reasoning.
      model = process.env.GROK_BACKGROUND_MODEL || 'grok-4.20-0309-non-reasoning'
    } else if (openaiKey) {
      ai = new OpenAI({ apiKey: openaiKey })
      model = 'gpt-4o-mini'
    } else {
      return NextResponse.json({ why: '' })
    }

    const system =
      `You are ORCA, Sonar's crypto market analyst. In ONE or TWO sentences (max ~45 words), ` +
      `explain WHY ${token || 'the asset'} is moving by connecting the headline to the price action. ` +
      `Ground every claim ONLY in the facts provided — never invent specific numbers, dates, names, ` +
      `or events that are not given. If the link is uncertain, say what the headline implies for the ` +
      `asset. Professional Bloomberg-terminal tone. No hype, no emojis, no hedging boilerplate, ` +
      `no financial-advice disclaimers, no preamble. Output plain text only.`

    const user =
      `Asset: ${token || 'n/a'} (${pctStr})\n` +
      `Headline: ${title}\n` +
      (description ? `Summary: ${description}\n` : '') +
      (source ? `Source: ${source}\n` : '') +
      (macro ? `Relevant macro backdrop: ${macro}\n` : '') +
      (sentiment ? `Sentiment read: ${sentiment}\n` : '') +
      `\nWrite the "why it moved" explanation:`

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 200,
    })

    let why = completion?.choices?.[0]?.message?.content?.trim() || ''
    why = why.replace(/^["“]+|["”]+$/g, '').trim()
    if (why.length > 360) why = why.slice(0, 357).trimEnd() + '…'

    if (why) {
      const entry = { why, at: Date.now() }
      cache.set(cacheKey, entry)
      trimCache()
      shared[cacheKey] = entry
      await writeShared(shared)
    }
    return NextResponse.json({ why })
  } catch (e) {
    // Non-fatal: client falls back to its own factual line.
    return NextResponse.json({ why: '' })
  }
}
