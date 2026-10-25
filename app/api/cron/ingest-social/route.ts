/**
 * CRON: Social feed ingestion via LunarCrush.
 * Schedule: every 2 hours at :30 (vercel.json).
 *
 * One call per topic (8): the top posts for each topic go into social_posts
 * (the dashboard's Social Pulse, /news social, social-post alerts).
 * Removed 2026-10-25: the creators list, the tracked-creator posts and the
 * AI "whatsup" summaries never wrote a row in eight months (social_creators,
 * the tracked_creator category and social_ai_summaries were all empty) and
 * spent ~250 LunarCrush calls a day of the 2,000/day cap ORCA shares.
 * Each run writes a system_health row (component 'ingest-social').
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { extractTickers } from '@/lib/orca/ticker-extractor'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const LC = 'https://lunarcrush.com/api4/public'

const TOPICS = ['bitcoin', 'ethereum', 'solana', 'xrp', 'dogecoin', 'defi', 'arbitrum', 'pepe']

export async function GET(request: Request) {
  const t0 = Date.now()

  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'LUNARCRUSH_API_KEY not set' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbwfvqzomipoftgodof.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const stats = { posts: 0, errors: 0 }
  const debug: string[] = []
  const hdr = { Authorization: `Bearer ${apiKey}` }
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

  // ─── Top posts per topic (8 calls) ────────────────────────────
  for (const topic of TOPICS) {
    if (Date.now() - t0 > 100000) break
    try {
      const r = await fetch(`${LC}/topic/${topic}/posts/v1?limit=15`, { headers: hdr, signal: AbortSignal.timeout(10000) })
      const txt = await r.text()
      debug.push(`${topic}: status=${r.status} len=${txt.length}`)
      if (r.ok && txt.length > 10) {
        const j = JSON.parse(txt)
        const items = j.data || j.results || (Array.isArray(j) ? j : [])
        debug.push(`${topic} items: ${items.length}`)
        // Log first item keys to understand structure
        if (items.length > 0) {
          const first = items[0]
          debug.push(`${topic} keys: ${Object.keys(first).join(',')}`)
          debug.push(`${topic} sample: title=${String(first.title||'').slice(0,50)} body=${String(first.body||'').slice(0,50)} text=${String(first.text||'').slice(0,50)} post_title=${String(first.post_title||'').slice(0,50)}`)
        }
        let topicInserted = 0
        let topicSkipped = 0
        let topicErrors: string[] = []
        for (const p of items.slice(0, 20)) {
          const body = p.post_title || p.post_description || p.body || p.text || p.title || ''
          if (body.length < 10) { topicSkipped++; continue }
          // Basic relevance filter: skip non-Latin-script-dominant posts
          const latinChars = (body.match(/[a-zA-Z]/g) || []).length
          const totalChars = body.length
          if (latinChars / totalChars < 0.3) { topicSkipped++; continue }
          try {
            const row = {
              post_id: String(p.id || Date.now() + Math.random()),
              post_type: p.post_type || 'tweet',
              network: p.network || 'twitter',
              creator_id: String(p.creator_id || ''),
              creator_name: p.creator_display_name || p.creator_name || null,
              creator_screen_name: p.creator_name || null,
              creator_followers: p.creator_followers || 0,
              creator_image: p.creator_avatar || null,
              body, title: p.post_title || null,
              url: p.post_link || null,
              image: p.post_image || null,
              sentiment: p.post_sentiment || null,
              interactions: p.interactions_24h || p.interactions_total || 0,
              likes: p.likes || 0, retweets: p.retweets || 0, replies: p.replies || 0,
              category: ['dogecoin', 'pepe'].includes(topic) ? 'memecoins' : topic === 'defi' ? 'defi' : 'cryptocurrencies',
              // LunarCrush posts carry no coins_mentioned field, so this was
              // always null and broke ticker-filtered alerts/feed. Extract
              // from the post text ourselves (high precision — cashtags +
              // coin names, no ambiguous bare tickers).
              tickers_mentioned: extractTickers(`${p.post_title || ''} ${body}`),
              published_at: p.post_created ? (typeof p.post_created === 'number' ? new Date(p.post_created * 1000).toISOString() : (String(p.post_created).match(/^\d{10,}$/) ? new Date(Number(p.post_created) * 1000).toISOString() : p.post_created)) : new Date().toISOString(),
              ingested_at: new Date().toISOString(),
            }
            const { error } = await sb.from('social_posts').upsert(row, { onConflict: 'post_id,network' })
            if (error) { topicErrors.push(error.message); }
            else topicInserted++
          } catch (ie: any) { topicErrors.push(ie.message) }
        }
        debug.push(`${topic}: inserted=${topicInserted} skipped=${topicSkipped} errs=${topicErrors.length}`)
        if (topicErrors.length > 0) debug.push(`${topic} err sample: ${topicErrors[0].slice(0, 100)}`)
        stats.posts += topicInserted
      }
    } catch (e: any) { stats.errors++; debug.push(`${topic} fetch err: ${e.message}`) }
    await wait(3500)
  }

  const elapsed = Date.now() - t0
  console.log(`[Social] Done in ${elapsed}ms:`, stats)
  try {
    await sb.from('system_health').insert({
      component: 'ingest-social',
      status: stats.posts > 0 ? (stats.errors > 0 ? 'partial' : 'ok') : 'error',
      started_at: new Date(t0).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: elapsed,
      details: { ...stats, topics: TOPICS.length },
    })
  } catch { /* best-effort heartbeat */ }

  return NextResponse.json({ success: true, elapsed_ms: elapsed, ...stats, debug: debug.slice(0, 30) })
}
