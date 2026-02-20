/**
 * CRON: Social Feed Ingestion via LunarCrush
 * Schedule: Every 4 hours
 * 
 * Optimized for Vercel 120s timeout:
 * - Step 1: Trending creators list (1 call)
 * - Step 2: Top posts per topic for 8 key topics (8 calls)
 * - Step 3: Top 15 tracked creator posts (15 calls)
 * - Step 4: AI summaries for 3 topics (3 calls)
 * Total: ~27 calls × 3.5s delay = ~95s (under 120s limit)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const LC = 'https://lunarcrush.com/api4/public'

// Top 15 highest-impact creators only (must fit in timeout)
const TRACKED = [
  'elonmusk', 'realDonaldTrump', 'VitalikButerin', 'CZ_Binance',
  'brian_armstrong', 'justinsuntron', 'APompliano', 'scottmelker',
  'WuBlockchain', 'CryptoCapo_', 'AltcoinSherpa', 'cobie',
  'tier10k', 'WatcherGuru', 'RaoulGMI'
]

const TOPICS = ['bitcoin', 'ethereum', 'solana', 'xrp', 'dogecoin', 'defi', 'arbitrum', 'pepe']
const AI_TOPICS = ['bitcoin', 'ethereum', 'solana']

export async function GET(request: Request) {
  const t0 = Date.now()

  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'LUNARCRUSH_API_KEY not set' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbwfvqzomipoftgodof.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const stats = { creators: 0, posts: 0, tracked: 0, summaries: 0, errors: 0 }
  const debug: string[] = []
  const hdr = { Authorization: `Bearer ${apiKey}` }
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

  // ─── STEP 1: Trending creators (1 call) ───────────────────────
  try {
    const r = await fetch(`${LC}/creators/list/v1?sort=interactions_24h&limit=50`, { headers: hdr, signal: AbortSignal.timeout(12000) })
    const txt = await r.text()
    debug.push(`creators: status=${r.status} len=${txt.length}`)
    if (r.ok && txt.length > 10) {
      const j = JSON.parse(txt)
      const items = j.data || j.results || (Array.isArray(j) ? j : [])
      debug.push(`creators items: ${items.length}`)
      for (const c of items.slice(0, 50)) {
        const { error } = await sb.from('social_creators').upsert({
          creator_id: String(c.id || c.twitter_screen_name || c.screen_name || Math.random()),
          network: c.network || 'twitter',
          screen_name: c.twitter_screen_name || c.screen_name || '',
          display_name: c.display_name || c.twitter_screen_name || '',
          followers: c.followers || c.twitter_followers || 0,
          interactions_24h: c.interactions_24h || 0,
          posts_24h: c.num_posts_24h || 0,
          rank: c.rank || null,
          profile_image: c.profile_image || c.twitter_profile_image || null,
          galaxy_score: c.galaxy_score || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'creator_id,network' })
        if (!error) stats.creators++
      }
    } else { debug.push(`creators: status=${r.status}`) }
  } catch (e: any) { stats.errors++; debug.push(`creators err: ${e.message}`) }
  await wait(3500)

  // ─── STEP 2: Top posts per topic (8 calls) ────────────────────
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
        let topicInserted = 0
        let topicSkipped = 0
        let topicErrors: string[] = []
        for (const p of items.slice(0, 20)) {
          const body = p.body || p.text || p.content || ''
          if (body.length < 10) { topicSkipped++; continue }
          try {
            const row = {
              post_id: String(p.id || p.post_id || Date.now() + Math.random()),
              post_type: p.post_type || 'tweet',
              network: p.network || 'twitter',
              creator_id: String(p.creator_id || ''),
              creator_name: p.creator_display_name || p.twitter_screen_name || null,
              creator_screen_name: p.twitter_screen_name || null,
              creator_followers: p.creator_followers || p.twitter_followers || 0,
              creator_image: p.creator_profile_image || p.twitter_profile_image || null,
              body, title: p.title || null,
              url: p.url || p.post_url || null,
              sentiment: p.sentiment || null,
              interactions: p.interactions_24h || p.interactions_total || 0,
              likes: p.likes || 0, retweets: p.retweets || 0, replies: p.replies || 0,
              category: ['dogecoin', 'pepe'].includes(topic) ? 'memecoins' : topic === 'defi' ? 'defi' : 'cryptocurrencies',
              tickers_mentioned: p.coins_mentioned || null,
              published_at: p.time ? new Date(p.time * 1000).toISOString() : new Date().toISOString(),
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

  // ─── STEP 3: Tracked creator posts (15 calls) ─────────────────
  for (const handle of TRACKED) {
    if (Date.now() - t0 > 100000) break
    try {
      const r = await fetch(`${LC}/creator/twitter/${handle}/posts/v1?limit=5`, { headers: hdr, signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const j = await r.json()
        for (const p of (j.data || [])) {
          const body = p.body || p.text || ''
          if (body.length < 10) continue
          const { error } = await sb.from('social_posts').upsert({
            post_id: String(p.id || Math.random()),
            post_type: p.post_type || 'tweet',
            network: p.network || 'twitter',
            creator_id: String(p.creator_id || handle),
            creator_name: p.creator_display_name || handle,
            creator_screen_name: p.twitter_screen_name || handle,
            creator_followers: p.creator_followers || 0,
            creator_image: p.creator_profile_image || null,
            body, title: p.title || null,
            url: p.url || null,
            sentiment: p.sentiment || null,
            interactions: p.interactions_24h || 0,
            likes: p.likes || 0, retweets: p.retweets || 0, replies: p.replies || 0,
            category: 'tracked_creator',
            published_at: p.time ? new Date(p.time * 1000).toISOString() : new Date().toISOString(),
            ingested_at: new Date().toISOString(),
          }, { onConflict: 'post_id,network' })
          if (!error) stats.tracked++
        }
      }
    } catch { stats.errors++ }
    await wait(3500)
  }

  // ─── STEP 4: AI Summaries (3 calls) ───────────────────────────
  for (const topic of AI_TOPICS) {
    if (Date.now() - t0 > 110000) break
    try {
      const r = await fetch(`${LC}/topic/${topic}/whatsup/v1`, { headers: hdr, signal: AbortSignal.timeout(10000) })
      if (r.ok) {
        const j = await r.json()
        const summary = j.data?.summary || j.data?.text || (typeof j.data === 'string' ? j.data : null)
        if (summary) {
          await sb.from('social_ai_summaries').insert({ topic, summary, generated_at: new Date().toISOString() })
          stats.summaries++
        }
      }
    } catch { stats.errors++ }
    await wait(3500)
  }

  const elapsed = Date.now() - t0
  console.log(`[Social] Done in ${elapsed}ms:`, stats)

  return NextResponse.json({ success: true, elapsed_ms: elapsed, ...stats, debug: debug.slice(0, 30) })
}
