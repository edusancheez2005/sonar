/**
 * PHASE 1 - CRON JOB 1: News Ingestion
 * Schedule: Every 12 hours
 * Purpose: Fetch news from LunarCrush (primary) and CryptoPanic (secondary)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Top 100+ crypto tickers to track (prioritizing ERC-20 tokens)
const TOP_TICKERS = [
  // Major Layer 1s
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'MATIC', 'TRX',
  'ATOM', 'NEAR', 'ALGO', 'VET', 'FIL', 'APT', 'HBAR', 'STX', 'INJ', 'FTM',
  'ETC', 'XLM', 'FLOW', 'ICP', 'THETA', 'XTZ', 'EOS', 'KAS', 'ROSE', 'MINA',
  
  // Stablecoins (for reference)
  'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD',
  
  // Major ERC-20 DeFi Tokens
  'UNI', 'LINK', 'AAVE', 'MKR', 'SNX', 'CRV', 'COMP', 'YFI', 'SUSHI', 'BAL',
  '1INCH', 'LDO', 'LIDO', 'FXS', 'CVX', 'RPL', 'DYDX', 'GMX', 'PERP', 'PENDLE',
  
  // Layer 2s & Scaling
  'ARB', 'OP', 'IMX', 'LRC', 'STRK', 'METIS', 'BOBA',
  
  // Meme Coins (ERC-20 & others)
  'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'DEGEN', 'WOJAK',
  'ELON', 'AKITA', 'KISHU', 'BABYDOGE', 'SAMO', 'MYRO',
  
  // Gaming & Metaverse (mostly ERC-20)
  'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'IMX', 'ILV', 'ALICE', 'TLM', 'YGG',
  'PRIME', 'BIGTIME', 'BEAM', 'RON', 'MAGIC', 'PORTAL',
  
  // AI & Data (ERC-20)
  'FET', 'AGIX', 'OCEAN', 'GRT', 'RNDR', 'AKT', 'TAO', 'PAAL',
  
  // NFT & Social
  'BLUR', 'LOOKS', 'APE', 'SUPER', 'CHZ', 'AUDIO', 'MASK',
  
  // Infrastructure & Oracles (ERC-20)
  'LINK', 'API3', 'BAND', 'TRB', 'DIA',
  
  // Popular ERC-20 Altcoins
  'BAT', 'ZRX', 'REQ', 'LRC', 'OMG', 'ZIL', 'ICX', 'QTUM', 'ONT', 'STORJ',
  'FUN', 'REN', 'KNC', 'ANT', 'NMR', 'MLN', 'POLY', 'POWR', 'CELR', 'ANKR',
  
  // Newer Trending Tokens
  'PENDLE', 'ARB', 'SUI', 'SEI', 'TIA', 'JTO', 'PYTH', 'JUPITER', 'WEN',
  
  // Exchange Tokens (ERC-20)
  'BNB', 'CRO', 'OKB', 'HT', 'LEO', 'GT', 'KCS'
]

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
    const errors: string[] = []

    // Fetch news for each ticker
    for (const ticker of TOP_TICKERS) {
      try {
        // 1. Fetch from LunarCrush (primary source)
        const lunarCrushInserted = await fetchLunarCrushNews(ticker, supabase)
        totalInserted += lunarCrushInserted
        totalFetched += lunarCrushInserted

        // Small delay to respect rate limits
        await delay(500)

        // 2. Fetch from CryptoPanic (secondary source)
        const cryptoPanicInserted = await fetchCryptoPanicNews(ticker, supabase)
        totalInserted += cryptoPanicInserted
        totalFetched += cryptoPanicInserted

        // Small delay to respect rate limits
        await delay(500)

      } catch (error) {
        const errorMsg = `Error fetching news for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

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
 * Fetch news from LunarCrush API
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

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log(`No news data from LunarCrush for ${ticker}`)
      return 0
    }

    let inserted = 0

    for (const item of data.data.slice(0, 10)) { // Limit to 10 most recent
      try {
        const { error } = await supabase
          .from('news_items')
          .insert({
            source: 'lunarcrush',
            external_id: item.id || item.url, // Use URL as fallback ID
            ticker: ticker,
            title: item.title || 'Untitled',
            url: item.url,
            published_at: item.published_at || item.created_at || new Date().toISOString(),
            content: item.content || item.summary,
            author: item.author || item.source?.name,
            sentiment_raw: item.sentiment || null,
            metadata: {
              source_type: 'lunarcrush',
              interactions: item.interactions_24h,
              creator_id: item.creator_id
            }
          })

        if (!error) {
          inserted++
        } else if (!error.message.includes('duplicate key')) {
          console.error(`Error inserting LunarCrush news for ${ticker}:`, error)
        }
      } catch (insertError) {
        console.error(`Failed to insert LunarCrush item for ${ticker}:`, insertError)
      }
    }

    return inserted

  } catch (error) {
    console.error(`LunarCrush fetch error for ${ticker}:`, error)
    return 0
  }
}

/**
 * Fetch news from CryptoPanic API
 */
async function fetchCryptoPanicNews(ticker: string, supabase: any): Promise<number> {
  try {
    const apiToken = process.env.CRYPTOPANIC_API_TOKEN
    if (!apiToken) {
      throw new Error('CRYPTOPANIC_API_TOKEN not configured')
    }

    const url = `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${apiToken}&currencies=${ticker}&public=true&kind=news`

    const response = await fetch(url)

    if (!response.ok) {
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

