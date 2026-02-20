/**
 * CRON: Social Feed Ingestion via LunarCrush
 * Schedule: Every 2 hours
 * 
 * Fetches:
 * 1. Top trending crypto creators (influencers) — ranked by interactions
 * 2. Top viral posts/tweets per major category
 * 3. Posts from specific tracked creators (Elon, Trump, CZ, Vitalik, etc.)
 * 4. AI-generated "what's up" summaries for top topics
 * 
 * Stores in: social_posts table
 * 
 * LunarCrush API budget: ~200-300 calls per run (well within 2,000/day limit)
 * Rate limit: 10 req/min on Individual plan → 1 request per 6 seconds
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 min timeout for large ingestion

const LUNARCRUSH_BASE = 'https://lunarcrush.com/api4/public'

// ─── TRACKED CREATORS (X/Twitter handles) ────────────────────────────
// High-profile individuals whose crypto tweets move markets
const TRACKED_CREATORS = [
  // Politicians & World Leaders
  'realDonaldTrump', 'POTUS', 'RobertKennedyJr',
  
  // Tech Billionaires
  'elonmusk', 'naval', 'balaboris', 'chaaboris',
  
  // Crypto Founders & CEOs
  'VitalikButerin', 'caboris', 'SBF_FTX', 'justinsuntron', 'CZ_Binance',
  'brian_armstrong', 'cdixon', 'aaboris',
  
  // Crypto VCs & Investors
  'TimDraper', 'APompliano', 'RaoulGMI', 'MarkCuban',
  'ChrisBurniske', 'AriannaSimpson', 'haaboris',
  
  // Top Crypto Traders & Analysts
  'CryptoCapo_', 'HsakaTrades', 'CryptoCred', 'SmartContracter',
  'GiganticRebirth', 'lightcrypto', 'inversebrah', 'Pentosh1',
  'CryptoKaleo', 'AltcoinSherpa', 'CryptoWendyO', 'TheCryptoLark',
  'MMCrypto', 'DataDash', 'scottmelker', 'CryptoGodJohn',
  'CryptoYoda1338', 'GCRClassic', 'cobie', 'DegenSpartan',
  'Trader_XO', 'DaanCrypto', 'raboris',
  
  // Crypto Media & Journalists
  'WuBlockchain', 'tier10k', 'BitcoinMagazine', 'CoinDesk',
  'Cointelegraph', 'TheBlock__', 'WatcherGuru', 'zaboris',
  
  // Protocol Founders
  'haaboris', 'staboris', 'SolanaLegend', 'anatoly_sol',
  'rajgokal', 'haboris',
  
  // DeFi Influencers
  'DeFi_Dad', 'DefiIgnas', 'route2fi', 'Dynamo_Patrick',
  
  // Meme/Culture Crypto
  'MustStopMurad', 'AnsemX', 'GiganticRebirth', 'blknoiz06',
]

// Categories to pull posts from
const CATEGORIES = ['cryptocurrencies', 'defi', 'nfts', 'memecoins', 'layer-1']

// Topics to get AI summaries for
const AI_SUMMARY_TOPICS = ['bitcoin', 'ethereum', 'solana', 'xrp', 'memecoins', 'defi']

// ─── MAIN HANDLER ────────────────────────────────────────────────────

export async function GET(request: Request) {
  const start = Date.now()
  
  // Auth
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'LUNARCRUSH_API_KEY not set' }, { status: 500 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fwbwfvqzomipoftgodof.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!supabaseKey) {
    return NextResponse.json({ error: 'Supabase service role not set' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const stats = { creators: 0, posts: 0, categoryPosts: 0, aiSummaries: 0, errors: 0 }
  const errors: string[] = []

  try {
    // ─── STEP 1: Fetch top trending creators globally ───────────────
    console.log('[Social] Fetching trending creators...')
    try {
      const creatorsData = await lcFetch(apiKey, '/creators/list/v1?sort=interactions_24h&limit=100')
      if (creatorsData?.data) {
        const creators = creatorsData.data.slice(0, 100)
        for (const creator of creators) {
          await upsertCreator(supabase, creator)
          stats.creators++
        }
        console.log(`[Social] Ingested ${stats.creators} trending creators`)
      }
    } catch (err: any) {
      errors.push(`Trending creators: ${err.message}`)
      stats.errors++
    }
    await delay(6500) // Rate limit: 10 req/min

    // ─── STEP 2: Fetch top posts per category ───────────────────────
    console.log('[Social] Fetching category posts...')
    for (const cat of CATEGORIES) {
      try {
        const postsData = await lcFetch(apiKey, `/category/${cat}/posts/v1?limit=20`)
        if (postsData?.data) {
          for (const post of postsData.data) {
            await upsertPost(supabase, post, cat)
            stats.categoryPosts++
          }
        }
      } catch (err: any) {
        errors.push(`Category ${cat} posts: ${err.message}`)
        stats.errors++
      }
      await delay(6500)
    }
    console.log(`[Social] Ingested ${stats.categoryPosts} category posts`)

    // ─── STEP 3: Fetch posts from tracked creators ──────────────────
    console.log('[Social] Fetching tracked creator posts...')
    for (const handle of TRACKED_CREATORS) {
      try {
        const postsData = await lcFetch(apiKey, `/creator/twitter/${handle}/posts/v1?limit=5`)
        if (postsData?.data) {
          for (const post of postsData.data) {
            post._tracked_creator = handle
            await upsertPost(supabase, post, 'tracked_creator')
            stats.posts++
          }
        }
      } catch (err: any) {
        // Don't log 404s — creator may not exist in LC
        if (!err.message?.includes('404')) {
          errors.push(`Creator ${handle}: ${err.message}`)
        }
        stats.errors++
      }
      await delay(6500)
    }
    console.log(`[Social] Ingested ${stats.posts} tracked creator posts`)

    // ─── STEP 4: AI summaries for top topics ────────────────────────
    console.log('[Social] Fetching AI summaries...')
    for (const topic of AI_SUMMARY_TOPICS) {
      try {
        const summaryData = await lcFetch(apiKey, `/topic/${topic}/whatsup/v1`)
        if (summaryData?.data) {
          await upsertAISummary(supabase, topic, summaryData.data)
          stats.aiSummaries++
        }
      } catch (err: any) {
        errors.push(`AI summary ${topic}: ${err.message}`)
        stats.errors++
      }
      await delay(6500)
    }
    console.log(`[Social] Generated ${stats.aiSummaries} AI summaries`)

  } catch (err: any) {
    console.error('[Social] Fatal error:', err)
    errors.push(`Fatal: ${err.message}`)
  }

  const elapsed = Date.now() - start
  console.log(`[Social] Complete in ${elapsed}ms:`, stats)

  return NextResponse.json({
    success: true,
    elapsed_ms: elapsed,
    ...stats,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  })
}

// ─── LUNARCRUSH API HELPER ───────────────────────────────────────────

async function lcFetch(apiKey: string, path: string): Promise<any> {
  const url = `${LUNARCRUSH_BASE}${path}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`LC API ${res.status}: ${path}`)
  }
  return res.json()
}

// ─── DATABASE HELPERS ────────────────────────────────────────────────

async function upsertCreator(supabase: any, creator: any) {
  const row = {
    creator_id: creator.id || creator.twitter_screen_name || creator.screen_name,
    network: creator.network || 'twitter',
    screen_name: creator.twitter_screen_name || creator.screen_name || creator.display_name,
    display_name: creator.display_name || creator.twitter_screen_name || '',
    followers: creator.followers || creator.twitter_followers || 0,
    interactions_24h: creator.interactions_24h || 0,
    posts_24h: creator.num_posts_24h || creator.posts_24h || 0,
    rank: creator.rank || null,
    profile_image: creator.profile_image || creator.twitter_profile_image || null,
    galaxy_score: creator.galaxy_score || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('social_creators')
    .upsert(row, { onConflict: 'creator_id,network' })

  if (error && !error.message?.includes('duplicate')) {
    console.error(`[Social] Creator upsert error:`, error.message)
  }
}

async function upsertPost(supabase: any, post: any, category: string) {
  const row = {
    post_id: String(post.id || post.post_id || ''),
    post_type: post.post_type || post.type || 'tweet',
    network: post.network || 'twitter',
    creator_id: post.creator_id || post._tracked_creator || null,
    creator_name: post.creator_display_name || post.creator_name || post.twitter_screen_name || post._tracked_creator || null,
    creator_screen_name: post.twitter_screen_name || post.creator_screen_name || post._tracked_creator || null,
    creator_followers: post.creator_followers || post.twitter_followers || 0,
    creator_image: post.creator_profile_image || post.twitter_profile_image || null,
    title: post.title || null,
    body: post.body || post.text || post.content || null,
    url: post.url || post.post_url || null,
    image: post.thumbnail || post.image || null,
    sentiment: post.sentiment || null,
    interactions: post.interactions_24h || post.interactions_total || 0,
    likes: post.likes || 0,
    retweets: post.retweets || post.retweet_count || 0,
    replies: post.replies || post.reply_count || 0,
    category: category,
    tickers_mentioned: post.coins_mentioned || post.tickers || null,
    published_at: post.time ? new Date(post.time * 1000).toISOString() : (post.published_at || new Date().toISOString()),
    ingested_at: new Date().toISOString(),
  }

  if (!row.post_id) return

  const { error } = await supabase
    .from('social_posts')
    .upsert(row, { onConflict: 'post_id,network' })

  if (error && !error.message?.includes('duplicate')) {
    console.error(`[Social] Post upsert error:`, error.message)
  }
}

async function upsertAISummary(supabase: any, topic: string, data: any) {
  const row = {
    topic: topic,
    summary: data.summary || data.text || JSON.stringify(data),
    generated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('social_ai_summaries')
    .insert(row)

  if (error && !error.message?.includes('duplicate')) {
    console.error(`[Social] AI summary insert error:`, error.message)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
