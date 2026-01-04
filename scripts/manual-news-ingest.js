/**
 * Manual News Ingestion Script
 * Run this locally to populate news_items table
 * (Cron jobs only run on Vercel)
 */

const { createClient } = require('@supabase/supabase-js')
// fetch is globally available in Node 18+, no need to import

// Load environment variables
require('dotenv').config({ path: '.env.local' })

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

async function fetchLunarCrushTopicNews(ticker, supabase) {
  try {
    const apiKey = process.env.LUNARCRUSH_API_KEY
    if (!apiKey) {
      console.error('❌ LUNARCRUSH_API_KEY not configured')
      return 0
    }

    const topicName = ticker.toLowerCase()
    const url = `https://lunarcrush.com/api4/public/topic/${topicName}/news/v1`

    console.log(`  📡 Fetching from LunarCrush topic/${topicName}/news...`)
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!response.ok) {
      console.error(`  ❌ LunarCrush API error: ${response.status}`)
      return 0
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log(`  ⚠️  No news data for ${ticker}`)
      return 0
    }

    let inserted = 0
    for (const item of data.data.slice(0, 15)) {
      try {
        if (!item.url) continue

        // Check if exists
        const { data: existing } = await supabase
          .from('news_items')
          .select('id')
          .eq('url', item.url)
          .single()

        if (existing) continue // Skip duplicates

        // Insert new article
        const { error } = await supabase
          .from('news_items')
          .insert({
            source: 'lunarcrush',
            external_id: item.id?.toString() || item.url,
            ticker: ticker.toUpperCase(),
            title: item.title || 'Untitled',
            url: item.url,
            published_at: new Date(item.time * 1000).toISOString(),
            fetched_at: new Date().toISOString(),
            sentiment_raw: null
          })

        if (!error) inserted++
      } catch (err) {
        console.error(`  ⚠️  Error saving article: ${err.message}`)
      }
    }

    return inserted
  } catch (error) {
    console.error(`  ❌ Error fetching LunarCrush news for ${ticker}:`, error.message)
    return 0
  }
}

async function fetchCryptoPanicNews(ticker, supabase) {
  try {
    const apiToken = process.env.CRYPTOPANIC_API_TOKEN
    if (!apiToken) {
      console.log('  ⚠️  CryptoPanic API token not configured')
      return 0
    }

    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiToken}&currencies=${ticker}&kind=news&filter=rising`

    console.log(`  📡 Fetching from CryptoPanic...`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`  ❌ CryptoPanic API error: ${response.status}`)
      return 0
    }

    const data = await response.json()
    const articles = data.results || []

    let inserted = 0
    for (const article of articles.slice(0, 10)) {
      try {
        if (!article.url) continue

        // Check if exists
        const { data: existing } = await supabase
          .from('news_items')
          .select('id')
          .eq('url', article.url)
          .single()

        if (existing) continue

        // Insert new article
        const { error } = await supabase
          .from('news_items')
          .insert({
            source: article.source?.title || 'cryptopanic',
            external_id: article.id?.toString() || article.url,
            ticker: ticker.toUpperCase(),
            title: article.title || 'Untitled',
            url: article.url,
            published_at: new Date(article.published_at).toISOString(),
            fetched_at: new Date().toISOString(),
            sentiment_raw: null
          })

        if (!error) inserted++
      } catch (err) {
        console.error(`  ⚠️  Error saving article: ${err.message}`)
      }
    }

    return inserted
  } catch (error) {
    console.error(`  ❌ Error fetching CryptoPanic for ${ticker}:`, error.message)
    return 0
  }
}

async function main() {
  console.log('🐋 ORCA AI - Manual News Ingestion')
  console.log('==================================\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  let totalInserted = 0

  for (const ticker of TOP_TICKERS) {
    console.log(`\n📊 Fetching news for ${ticker}...`)
    
    const lcInserted = await fetchLunarCrushTopicNews(ticker, supabase)
    const cpInserted = await fetchCryptoPanicNews(ticker, supabase)
    
    const tickerTotal = lcInserted + cpInserted
    totalInserted += tickerTotal
    
    console.log(`  ✅ Inserted ${tickerTotal} new articles for ${ticker}`)
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ COMPLETE! Inserted ${totalInserted} total articles`)
  console.log('='.repeat(50))
  
  // Show summary
  console.log('\n📊 Database Summary:')
  for (const ticker of TOP_TICKERS) {
    const { count } = await supabase
      .from('news_items')
      .select('*', { count: 'exact', head: true })
      .eq('ticker', ticker)
    
    console.log(`  ${ticker}: ${count} articles`)
  }
}

main().catch(console.error)

