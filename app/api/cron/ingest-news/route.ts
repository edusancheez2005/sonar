/**
 * PHASE 1 - CRON JOB 1: News Ingestion
 * Schedule: Every 12 hours
 * Purpose: Fetch news from LunarCrush (primary) and CryptoPanic (secondary)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isCryptoRelevant, isGeneralCryptoRelevant } from '@/lib/crypto-relevance-filter'

export const dynamic = 'force-dynamic'
// Full 30-ticker sweep with the widened window runs ~56s (2026-09-23) — give
// it headroom instead of riding the default budget.
export const maxDuration = 120

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

    // Every zero-path here used to be silent (empty API response, all-duplicate
    // batch, insert failure, per-ticker fetch error all reported as "0, no
    // errors"), which made a week of dead ingestion invisible. Count them.
    const stats: IngestStats = {
      api_items: 0, empty_responses: 0, filtered: 0,
      duplicates: 0, insert_errors: 0, fetch_errors: 0,
      per_feed: {},
    }

    // 0. PUBLISHER RSS FEEDS FIRST — keyless and quota-free, so they run even
    //    when every paid API is down. Added 2026-09-30: LunarCrush topic feeds
    //    stopped indexing new articles for everything but BTC on ~2026-09-10
    //    (per_feed diag: ETH/SOL/XRP/LINK newest item = Sep 10), which starved
    //    per-ticker news and froze sentiment for ETH (135h) / SOL (148h) /
    //    XRP (19d). RSS + isCryptoRelevant tagging + the analyze-sentiment LLM
    //    pass keeps the pipeline alive with zero external dependencies.
    for (const feed of RSS_FEEDS) {
      try {
        totalInserted += await fetchRssFeedNews(feed, supabase, stats)
        await delay(300)
      } catch (e) {
        const msg = `RSS ${feed.name}: ${e instanceof Error ? e.message : 'unknown'}`
        console.error(msg)
        errors.push(msg)
        stats.fetch_errors++
      }
    }

    // 1. CATEGORY-LEVEL NEWS — highest-quality general crypto news from
    //    LunarCrush.  Before the per-ticker sweep so even if we hit the daily
    //    quota mid-run we still have general feed content.
    for (const cat of CATEGORIES) {
      try {
        const inserted = await fetchLunarCrushCategoryNews(cat, supabase, stats)
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
          const lunarCrushInserted = await fetchLunarCrushNews(ticker, supabase, stats)
          if (lunarCrushInserted < 0) { lunarCrushQuotaExhausted = true; break }
          totalInserted += lunarCrushInserted
          totalFetched += lunarCrushInserted
          await delay(500)

          if (!cryptoPanicDisabled) {
            const cryptoPanicInserted = await fetchCryptoPanicNews(ticker, supabase, stats)
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
      stats,
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

type IngestStats = {
  api_items: number        // raw items returned by the APIs
  empty_responses: number  // 200s with no data array / empty data
  filtered: number         // dropped by title/url/tweet/relevance filters
  duplicates: number       // insert hit duplicate-key (already ingested)
  insert_errors: number    // insert failed for any other reason
  fetch_errors: number     // per-ticker fetch threw (swallowed before)
  first_insert_error?: string
  first_fetch_error?: string
  // 2026-09-30 staleness postmortem: aggregate counters could not tell WHICH
  // feed went dark or why (ETH/SOL/GENERAL froze for a week while BTC flowed).
  // One compact line per feed: raw items, article candidates after the
  // tweet/junk pre-filter, newest candidate publish time, inserted, dupes.
  per_feed: Record<string, string>
}

/**
 * Fetch CATEGORY-level news from LunarCrush.
 * Categories return general high-quality crypto news (not filtered to a single token).
 * Returns -1 to signal daily quota exhaustion (caller should stop).
 */
// Publisher RSS feeds — RSS 2.0 only (parsed with a small regex extractor;
// no XML dependency). All verified reachable from Vercel 2026-09-30.
const RSS_FEEDS = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
]

// Explicit-mention patterns for RSS tagging. Collision-prone symbols (LINK,
// OP, NEAR, TON, STX, DOT…) only match on their unambiguous full names —
// under-tagging beats misfiling; untagged crypto articles land in GENERAL.
const TICKER_MENTION: Record<string, RegExp> = {
  BTC: /\b(bitcoin|btc)\b/i,
  ETH: /\b(ethereum|ether|eth)\b/i,
  SOL: /\b(solana|sol)\b/i,
  XRP: /\b(xrp|ripple)\b/i,
  BNB: /\bbnb\b/i,
  DOGE: /\b(dogecoin|doge)\b/i,
  ADA: /\bcardano\b/i,
  TRX: /\btron\b/i,
  AVAX: /\b(avalanche|avax)\b/i,
  LINK: /\bchainlink\b/i,
  DOT: /\bpolkadot\b/i,
  MATIC: /\b(polygon|matic)\b/i,
  TON: /\btoncoin\b/i,
  SHIB: /\b(shiba inu|shib)\b/i,
  LTC: /\b(litecoin|ltc)\b/i,
  UNI: /\buniswap\b/i,
  BCH: /\b(bitcoin cash|bch)\b/i,
  NEAR: /\bnear protocol\b/i,
  ICP: /\b(internet computer|icp)\b/i,
  APT: /\baptos\b/i,
  ARB: /\barbitrum\b/i,
  OP: /\b(op mainnet|optimism superchain|op token)\b/i,
  PEPE: /\bpepe\b/i,
  AAVE: /\baave\b/i,
  INJ: /\binjective\b/i,
  STX: /\bstx\b/i,
  SUI: /\bsui\b/i,
  TIA: /\bcelestia\b/i,
  FIL: /\bfilecoin\b/i,
  HBAR: /\b(hedera|hbar)\b/i,
}

function rssField(item: string, tag: string): string | null {
  const m = item.match(new RegExp(`<${tag}[^>]*>(?:\\s*<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>\\s*)?</${tag}>`, 'i'))
  if (!m) return null
  return m[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null
}

/**
 * Ingest one publisher RSS feed. Articles are tagged to the first
 * TOP_TICKERS symbol that passes isCryptoRelevant (the news_items url unique
 * key means one row per article anyway), else 'GENERAL' when generally
 * crypto-relevant, else dropped.
 */
async function fetchRssFeedNews(feed: { name: string; url: string }, supabase: any, stats: IngestStats): Promise<number> {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SonarTracker/1.0' },
  })
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`)
  const xml = await response.text()
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || []
  stats.api_items += items.length

  let inserted = 0
  let dupes = 0
  for (const raw of items.slice(0, 40)) {
    try {
      const title = rssField(raw, 'title')
      const linkRaw = raw.match(/<link[^>]*>(?:\s*<!\[CDATA\[)?([\s\S]*?)(?:\]\]>\s*)?<\/link>/i)
      const link = linkRaw ? linkRaw[1].trim() : null
      const desc = rssField(raw, 'description')
      const pub = raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      if (!title || !link || !/^https?:\/\//.test(link)) { stats.filtered++; continue }

      const text = `${title} ${desc || ''}`
      // isCryptoRelevant only DISAMBIGUATES (Honda CR-V vs CRV) — it never
      // checks that the ticker is mentioned at all, because LunarCrush topic
      // feeds were already per-ticker. RSS is a general firehose, so gate on
      // an explicit mention first (first run without this tagged all 105
      // articles as BTC), then let isCryptoRelevant veto collisions.
      let ticker: string | null = null
      for (const t of TOP_TICKERS) {
        const rx = TICKER_MENTION[t]
        if (rx && rx.test(text) && isCryptoRelevant(text, t)) { ticker = t; break }
      }
      if (!ticker) {
        if (!isGeneralCryptoRelevant(text)) { stats.filtered++; continue }
        ticker = 'GENERAL'
      }

      const publishedMs = pub ? Date.parse(pub) : NaN
      const { error } = await supabase.from('news_items').insert({
        source: feed.name,
        external_id: link,
        ticker,
        title,
        url: link,
        published_at: Number.isFinite(publishedMs) ? new Date(publishedMs).toISOString() : new Date().toISOString(),
        content: desc || null,
        author: null,
        sentiment_raw: null, // analyze-sentiment fills sentiment_llm
        metadata: { source_type: 'rss', feed: feed.name },
      })
      if (!error) inserted++
      else if (error.message.includes('duplicate key')) { dupes++; stats.duplicates++ }
      else {
        stats.insert_errors++
        stats.first_insert_error ||= error.message
        console.error(`[ingest-news] RSS insert error (${feed.name}):`, error.message)
      }
    } catch (e) {
      stats.insert_errors++
      console.error(`[ingest-news] RSS item failed (${feed.name}):`, e)
    }
  }
  stats.per_feed[`rss:${feed.name}`] = `raw=${items.length} new=${inserted} dup=${dupes}`
  return inserted
}

async function fetchLunarCrushCategoryNews(category: string, supabase: any, stats: IngestStats): Promise<number> {
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
  if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) { stats.empty_responses++; return 0 }
  stats.api_items += data.data.length

  let inserted = 0
  let catDupes = 0
  // 2026-09-30: pre-filter tweets/junk BEFORE the 60-item window (same bug as
  // the per-ticker path — see note there), and sort newest-first so fresh
  // articles can't be crowded out by feed-order noise.
  const catCandidates = (data.data as any[])
    .map((item: any) => ({ item, title: item.post_title || item.title, url2: item.post_link || item.url }))
    .filter(({ title, url2 }) => {
      const junk = !title || title === 'Untitled' || !url2 || /(?:twitter\.com|x\.com)\//i.test(url2)
      if (junk) stats.filtered++
      return !junk
    })
    .sort((a: any, b: any) => {
      const ts = (x: any) => Date.parse(x.item.post_created ? new Date(Number(x.item.post_created) * 1000).toISOString() : x.item.published_at || 0) || 0
      return ts(b) - ts(a)
    })
  for (const { item, title, url2 } of catCandidates.slice(0, 60)) {
    try {
      // Crypto outlets syndicate general tech/AI stories (OpenAI lawsuits,
      // Xbox layoffs, image-model reviews) through LunarCrush categories;
      // keep them out of the terminal feed.
      const catBody = item.post_description || item.post_content || item.content || ''
      if (!isGeneralCryptoRelevant(`${title} ${catBody}`)) { stats.filtered++; continue }

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
        // news_items.ticker is NOT NULL — inserting null here rejected every
        // category article since the feature shipped (the silent zero-path
        // that emptied TOP NEWS). 'GENERAL' never collides with token pages,
        // which filter .eq('ticker', symbol).
        ticker: 'GENERAL',
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
      else if (error.message.includes('duplicate key')) {
        catDupes++
        stats.duplicates++
      } else {
        stats.insert_errors++
        stats.first_insert_error ||= error.message
        console.error(`[ingest-news] Insert error (category ${category}):`, error.message)
      }
    } catch (e) {
      stats.insert_errors++
      console.error(`[ingest-news] Failed to insert category item:`, e)
    }
  }
  stats.per_feed[`cat:${category}`] =
    `raw=${data.data.length} art=${catCandidates.length} new=${inserted} dup=${catDupes}`
  console.log(`[ingest-news] category=${category} inserted=${inserted} of ${data.data.length}`)
  return inserted
}

/**
 * Fetch news from LunarCrush API for a specific ticker.
 * Returns -1 on daily quota exhaustion.
 */
async function fetchLunarCrushNews(ticker: string, supabase: any, stats: IngestStats): Promise<number> {
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
    
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.log(`No news data from LunarCrush for ${ticker}`)
      stats.empty_responses++
      return 0
    }
    stats.api_items += data.data.length

    let inserted = 0
    let skipped = 0
    let dupes = 0

    // 2026-09-23: this was slice(0, 10) — but LunarCrush does not return
    // newest-first, so every 4h run re-examined the same 10 already-stored
    // items and inserted NOTHING for days. Sort by publish time ourselves and
    // examine a wide window; the url unique key makes duplicates cheap.
    //
    // 2026-09-30: the window must be taken AFTER the tweet/junk pre-filter,
    // not before. Topic feeds for some tickers (ETH/SOL) are dominated by
    // x.com posts; with filter-after-slice, 40 newest raw items were all
    // tweets, every real article fell outside the window, and those feeds
    // inserted nothing from 2026-09-23 on while BTC (news-dense feed) kept
    // working. Pre-filter to article candidates, then sort, then window.
    const candidates = (data.data as any[])
      .map((item: any) => ({
        item,
        // LunarCrush news items use post_* field names (post_title/post_link/
        // post_created/...), NOT title/url. Reading the wrong fields previously
        // stored titleless, urlless "Untitled" junk rows with published_at=now.
        title: item.post_title || item.title,
        url2: item.post_link || item.url,
      }))
      .filter(({ title, url2 }) => {
        // Pure tweets belong in social_posts, not the news feed.
        const junk = !title || title === 'Untitled' || !url2 || /(?:twitter\.com|x\.com)\//i.test(url2)
        if (junk) { skipped++; stats.filtered++ }
        return !junk
      })
      .sort((a: any, b: any) => {
        const ts = (x: any) => Date.parse(x.item.post_created ? new Date(Number(x.item.post_created) * 1000).toISOString() : x.item.published_at || x.item.created_at || 0) || 0
        return ts(b) - ts(a)
      })

    const newest = candidates[0]?.item
    const newestIso = newest?.post_created
      ? new Date(Number(newest.post_created) * 1000).toISOString()
      : newest?.published_at || null

    for (const { item, title, url2 } of candidates.slice(0, 40)) {
      try {
        const body = item.post_description || item.post_content || item.content || item.summary || ''
        const articleText = `${title} ${body}`

        // Filter out irrelevant content (e.g., Honda CR-V for CRV ticker)
        if (!isCryptoRelevant(articleText, ticker)) {
          skipped++
          stats.filtered++
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
        } else if (error.message.includes('duplicate key')) {
          dupes++
          stats.duplicates++
        } else {
          stats.insert_errors++
          stats.first_insert_error ||= error.message
          console.error(`Error inserting LunarCrush news for ${ticker}:`, error.message)
        }
      } catch (insertError) {
        stats.insert_errors++
        console.error(`Failed to insert LunarCrush item for ${ticker}:`, insertError)
      }
    }

    stats.per_feed[ticker] =
      `raw=${data.data.length} art=${candidates.length} new=${inserted} dup=${dupes} newest=${newestIso ? newestIso.slice(5, 16) : 'n/a'}`
    if (skipped > 0) console.log(`  ⏭️  Skipped ${skipped} irrelevant articles for ${ticker}`)
    return inserted

  } catch (error) {
    stats.fetch_errors++
    stats.first_fetch_error ||= error instanceof Error ? error.message : String(error)
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

async function fetchCryptoPanicNews(ticker: string, supabase: any, stats: IngestStats): Promise<number> {
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

    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      console.log(`No news data from CryptoPanic for ${ticker}`)
      stats.empty_responses++
      return 0
    }
    stats.api_items += data.results.length

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
        } else if (error.message.includes('duplicate key')) {
          stats.duplicates++
        } else {
          stats.insert_errors++
          stats.first_insert_error ||= error.message
          console.error(`Error inserting CryptoPanic news for ${ticker}:`, error)
        }
      } catch (insertError) {
        stats.insert_errors++
        console.error(`Failed to insert CryptoPanic item for ${ticker}:`, insertError)
      }
    }

    return inserted

  } catch (error) {
    stats.fetch_errors++
    stats.first_fetch_error ||= error instanceof Error ? error.message : String(error)
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

