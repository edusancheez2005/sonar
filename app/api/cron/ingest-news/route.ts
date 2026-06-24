/**
 * PHASE 1 - CRON JOB 1: News Ingestion
 * Schedule: Every 12 hours
 * Purpose: Fetch news from LunarCrush (primary) and CryptoPanic (secondary)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isCryptoRelevant } from '@/lib/crypto-relevance-filter'

export const dynamic = 'force-dynamic'

// Top 30 tickers ONLY — keeps us safely inside LunarCrush daily quota
// (each ticker = 1 LC API call per run; 30 tickers × ~6 runs/day = 180 LC calls
// plus 4 category calls/run = 24/day → ~204/day, well under typical $79/mo quotas).
// Rotation order matters: most-traded / most-newsy first so a partial run still has signal.
const TOP_TICKERS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'TRX', 'AVAX', 'LINK',
  'DOT', 'MATIC', 'TON', 'SHIB', 'LTC', 'UNI', 'BCH', 'NEAR', 'ICP', 'APT',
  'ARB', 'OP', 'PEPE', 'AAVE', 'INJ', 'STX', 'SUI', 'TIA', 'FIL', 'HBAR'
]

// LunarCrush categories — pulls high-quality general crypto news (not
// per-ticker filtered).  This is what powers the main News Terminal feed.
const CATEGORIES = ['cryptocurrencies', 'defi', 'nfts', 'memecoins', 'layer-2']

interface LunarCrushNewsItem {
  id: string
  title: string
  url: string
  published_at: string
  author?: string
  content?: string
  sentiment?: number
}

interface CryptoPanicNewsItem {
  id: number
  title: string
  url: string
  published_at: string
  source?: { title: string }
  votes?: {
    positive: number
    negative: number
    important: number
  }
}

export async function GET(request: Request) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    let totalInserted = 0
    let totalFetched = 0
    let categoryInserted = 0
    const errors: string[] = []
    let lunarCrushQuotaExhausted = false

    // 1. CATEGORY-LEVEL NEWS FIRST — this is the highest-quality general crypto
    //    news.  Do it first so even if we hit the daily quota mid-run we still
    //    have great general feed content.
    for (const cat of CATEGORIES) {
      try {
        const inserted = await fetchLunarCrushCategoryNews(cat, supabase)
        if (inserted < 0) { lunarCrushQuotaExhausted = true; break }
        categoryInserted += inserted
        totalInserted += inserted
        totalFetched += inserted
        await delay(500)
      } catch (e) {
        const msg = `Category ${cat}: ${e instanceof Error ? e.message : 'unknown'}`
        console.error(msg)
        errors.push(msg)
      }
    }

    // 2. PER-TICKER NEWS — adds ticker tagging for token detail pages.
    if (!lunarCrushQuotaExhausted) {
      for (const ticker of TOP_TICKERS) {
        try {
          const lunarCrushInserted = await fetchLunarCrushNews(ticker, supabase)
          if (lunarCrushInserted < 0) { lunarCrushQuotaExhausted = true; break }
          totalInserted += lunarCrushInserted
          totalFetched += lunarCrushInserted
          await delay(500)

          if (!cryptoPanicDisabled) {
            const cryptoPanicInserted = await fetchCryptoPanicNews(ticker, supabase)
            totalInserted += cryptoPanicInserted
            totalFetched += cryptoPanicInserted
            await delay(500)
          }
        } catch (error) {
          const errorMsg = `Error fetching news for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }
    }

    if (lunarCrushQuotaExhausted) {
      const msg = 'LunarCrush daily quota exhausted — partial run.  Consider lowering cron frequency.'
      console.warn(`[ingest-news] ${msg}`)
      errors.push(msg)
    }
    console.log(`[ingest-news] category=${categoryInserted} total=${totalInserted}`)

    console.log(`✅ News ingestion complete: ${totalInserted} new articles inserted (${totalFetched} total fetched) for ${TOP_TICKERS.length} tickers`)
    
    if (errors.length > 0) {
      console.error(`⚠️ Encountered ${errors.length} errors:`, errors)
    }

    return NextResponse.json({
      success: true,
      totalInserted,
      totalFetched,
      tickers: TOP_TICKERS.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Fatal error in news ingestion:', error)
    return NextResponse.json(
      { 
        error: 'News ingestion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch CATEGORY-level news from LunarCrush.
 * Categories return general high-quality crypto news (not filtered to a single token).
 * Returns -1 to signal daily quota exhaustion (caller should stop).
 */
async function fetchLunarCrushCategoryNews(category: string, supabase: any): Promise<number> {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) throw new Error('LUNARCRUSH_API_KEY not configured')

  const url = `https://lunarcrush.com/api4/public/category/${category}/news/v1`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })

  if (response.status === 429) {
    console.warn(`[ingest-news] LunarCrush 429 on category ${category} — daily quota likely exhausted`)
    return -1
  }
  if (!response.ok) throw new Error(`LunarCrush category error: ${response.status} ${response.statusText}`)

  const data = await response.json()
  if (!data?.data || !Array.isArray(data.data)) return 0

  let inserted = 0
  for (const item of data.data.slice(0, 25)) {
    try {
      const title = item.post_title || item.title
      const url2 = item.post_link || item.url
      if (!title || title === 'Untitled' || !url2) continue

      // LunarCrush sentiment is 1..5 → normalize to -1..+1.
      let sentimentRaw: number | null = null
      if (typeof item.post_sentiment === 'number') {
        sentimentRaw = (item.post_sentiment - 3) / 2
      } else if (typeof item.sentiment === 'number') {
        sentimentRaw = (item.sentiment - 3) / 2
      }

      const publishedIso = item.post_created
        ? new Date(item.post_created * 1000).toISOString()
        : (item.published_at || new Date().toISOString())

      const { error } = await supabase.from('news_items').insert({
        source: item.creator_display_name || item.creator_name || 'lunarcrush',
        external_id: String(item.id || item.post_link || url2),
        ticker: null, // category-level — not tied to one ticker
        title,
        url: url2,
        published_at: publishedIso,
        content: item.post_content || item.content || null,
        author: item.creator_display_name || item.creator_name || null,
        sentiment_raw: sentimentRaw,
        metadata: {
          source_type: 'lunarcrush_category',
          category,
          interactions: item.interactions_24h || item.interactions_total,
          creator_id: item.creator_id,
          creator_followers: item.creator_followers,
        },
      })
      if (!error) inserted++
      else if (!error.message.includes('duplicate key')) {
        console.error(`[ingest-news] Insert error (category ${category}):`, error.message)
      }
    } catch (e) {
      console.error(`[ingest-news] Failed to insert category item:`, e)
    }
  }
  console.log(`[ingest-news] category=${category} inserted=${inserted} of ${data.data.length}`)
  return inserted
}

/**
 * Fetch news from LunarCrush API for a specific ticker.
 * Returns -1 on daily quota exhaustion.
 */
async function fetchLunarCrushNews(ticker: string, supabase: any): Promise<number> {
  try {
    const apiKey = process.env.LUNARCRUSH_API_KEY
    if (!apiKey) {
      throw new Error('LUNARCRUSH_API_KEY not configured')
    }

    const topicName = ticker.toLowerCase()
    const url = `https://lunarcrush.com/api4/public/topic/${topicName}/news/v1`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.status === 429) {
      console.warn(`[ingest-news] LunarCrush 429 on ${ticker} — daily quota exhausted, stopping`)
      return -1
    }

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log(`No news data from LunarCrush for ${ticker}`)
      return 0
    }

    let inserted = 0
    let skipped = 0

    for (const item of data.data.slice(0, 10)) { // Limit to 10 most recent
      try {
        // LunarCrush news items use post_* field names (post_title/post_link/
        // post_created/...), NOT title/url. Reading the wrong fields previously
        // stored titleless, urlless "Untitled" junk rows with published_at=now.
        // Map the correct fields and skip anything that isn't a real article.
        const title = item.post_title || item.title
        const url2 = item.post_link || item.url
        if (!title || title === 'Untitled' || !url2) {
          skipped++
          continue
        }
        // Pure tweets belong in social_posts, not the news feed.
        if (/(?:twitter\.com|x\.com)\//i.test(url2)) {
          skipped++
          continue
        }

        const body = item.post_description || item.post_content || item.content || item.summary || ''
        const articleText = `${title} ${body}`

        // Filter out irrelevant content (e.g., Honda CR-V for CRV ticker)
        if (!isCryptoRelevant(articleText, ticker)) {
          skipped++
          continue
        }

        // LunarCrush sentiment is 1..5 → normalize to -1..+1.
        let sentimentRaw: number | null = null
        if (typeof item.post_sentiment === 'number') sentimentRaw = (item.post_sentiment - 3) / 2
        else if (typeof item.sentiment === 'number') sentimentRaw = (item.sentiment - 3) / 2

        const publishedIso = item.post_created
          ? new Date(item.post_created * 1000).toISOString()
          : item.published_at || item.created_at || new Date().toISOString()

        const { error } = await supabase
          .from('news_items')
          .insert({
            source: 'lunarcrush',
            external_id: String(item.id || item.post_link || url2),
            ticker: ticker,
            title,
            url: url2,
            published_at: publishedIso,
            content: body || null,
            author: item.creator_display_name || item.creator_name || item.author || null,
            sentiment_raw: sentimentRaw,
            metadata: {
              source_type: 'lunarcrush',
              interactions: item.interactions_24h || item.interactions_total,
              creator_id: item.creator_id,
            },
          })

        if (!error) {
          inserted++
        } else if (!error.message.includes('duplicate key')) {
          console.error(`Error inserting LunarCrush news for ${ticker}:`, error.message)
        }
      } catch (insertError) {
        console.error(`Failed to insert LunarCrush item for ${ticker}:`, insertError)
      }
    }

    if (skipped > 0) console.log(`  ⏭️  Skipped ${skipped} irrelevant articles for ${ticker}`)
    return inserted

  } catch (error) {
    console.error(`LunarCrush fetch error for ${ticker}:`, error)
    return 0
  }
}

/**
 * Fetch news from CryptoPanic API
 *
 * NOTE: The free CryptoPanic Developer plan was discontinued on 2026-04-01.
 * Until we either upgrade to a paid plan or migrate to an alternative source,
 * the call will hard-fail with 401/403/404. We detect that on the first ticker
 * of a run, set `cryptoPanicDisabled = true`, and skip the remaining ~150
 * tickers silently to avoid spamming logs and burning ~75s of cron time.
 *
 * To force-disable without a deploy, set CRYPTOPANIC_DISABLED=true.
 */
let cryptoPanicDisabled = process.env.CRYPTOPANIC_DISABLED === 'true'
let cryptoPanicDisabledLogged = false

function disableCryptoPanic(reason: string): void {
  cryptoPanicDisabled = true
  if (!cryptoPanicDisabledLogged) {
    console.warn(`[ingest-news] CryptoPanic disabled for the rest of this run: ${reason}`)
    cryptoPanicDisabledLogged = true
  }
}

async function fetchCryptoPanicNews(ticker: string, supabase: any): Promise<number> {
  try {
    const apiToken = process.env.CRYPTOPANIC_API_TOKEN
    if (!apiToken) {
      disableCryptoPanic('CRYPTOPANIC_API_TOKEN not configured')
      return 0
    }

    const url = `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${apiToken}&currencies=${ticker}&public=true&kind=news`

    const response = await fetch(url)

    if (!response.ok) {
      // Hard auth/endpoint failures are not transient -- short-circuit the rest of the run.
      if ([401, 403, 404, 410].includes(response.status)) {
        disableCryptoPanic(`HTTP ${response.status} ${response.statusText} (likely free Developer plan retired 2026-04-01)`)
        return 0
      }
      throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.results || !Array.isArray(data.results)) {
      console.log(`No news data from CryptoPanic for ${ticker}`)
      return 0
    }

    let inserted = 0

    for (const item of data.results.slice(0, 10)) { // Limit to 10 most recent
      try {
        // Calculate basic sentiment from votes
        let sentimentRaw: number | null = null
        if (item.votes) {
          const positive = item.votes.positive || 0
          const negative = item.votes.negative || 0
          const total = positive + negative
          if (total > 0) {
            sentimentRaw = (positive - negative) / total // -1 to +1
          }
        }

        const { error } = await supabase
          .from('news_items')
          .insert({
            source: 'cryptopanic',
            external_id: String(item.id),
            ticker: ticker,
            title: item.title,
            url: item.url,
            published_at: item.published_at,
            content: item.content?.clean || item.content?.original,
            author: item.author,
            sentiment_raw: sentimentRaw,
            votes_positive: item.votes?.positive || 0,
            votes_negative: item.votes?.negative || 0,
            metadata: {
              source_type: 'cryptopanic',
              kind: item.kind,
              source_domain: item.source?.domain,
              votes: item.votes
            }
          })

        if (!error) {
          inserted++
        } else if (!error.message.includes('duplicate key')) {
          console.error(`Error inserting CryptoPanic news for ${ticker}:`, error)
        }
      } catch (insertError) {
        console.error(`Failed to insert CryptoPanic item for ${ticker}:`, insertError)
      }
    }

    return inserted

  } catch (error) {
    console.error(`CryptoPanic fetch error for ${ticker}:`, error)
    return 0
  }
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

