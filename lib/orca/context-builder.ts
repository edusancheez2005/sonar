/**
 * PHASE 2 - ORCA AI: Context Builder
 * Aggregates data from all sources (whale, sentiment, news, social, price)
 */

import { createClient } from '@supabase/supabase-js'
import { 
  parseLunarCrushAI, 
  fetchFreshLunarCrushData, 
  needsFreshData 
} from './lunarcrush-parser'
import { 
  formatWhaleMovesDetailed,
  formatThemes,
  formatNewsHeadlinesDetailed,
  formatCurrency,
  formatLargeNumber,
  formatPercentage,
  formatPriceTrend,
  calculateSentimentTrend,
  formatNetFlowInterpretation,
  truncateAddress
} from './formatters'

interface OrcaContext {
  ticker: string
  price: PriceData
  whales: WhaleData
  sentiment: SentimentData
  social: SocialData
  news: NewsData
}

interface PriceData {
  current: number
  change_24h: number
  market_cap: number
  volume_24h: number
  trend: string
  ath: number | null
  ath_date: string | null
  ath_distance: number | null
  atl: number | null
  market_cap_rank: number | null
}

interface WhaleData {
  transaction_count: number
  total_volume_usd: number
  avg_transaction_usd: number
  net_flow_24h: number
  avg_whale_score: number
  cex_transactions: number
  dex_transactions: number
  accumulation_count: number
  distribution_count: number
  top_moves: any[]
  data_focus: string
}

interface SentimentData {
  current: number
  trend: string
  news_count: number
  confidence: number
  provider_sentiment: number | null
  llm_sentiment: number | null
}

interface SocialData {
  sentiment_pct: number | null
  engagement: number | null
  mentions: number | null
  creators: number | null
  supportive_themes: string[]
  critical_themes: string[]
  top_creators: any[]
}

interface NewsData {
  headlines: any[]
  total_count: number
}

/**
 * Main function: Build complete ORCA context for a ticker
 */
export async function buildOrcaContext(
  ticker: string,
  userId: string
): Promise<OrcaContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Fetch data from all sources (parallel for speed)
  const [
    whaleData,
    sentimentData,
    newsData,
    priceData,
    socialData
  ] = await Promise.all([
    fetchWhaleActivity(ticker, supabase),
    fetchSentiment(ticker, supabase),
    fetchNews(ticker, supabase),
    fetchPriceData(ticker, supabase),
    fetchLunarCrushAI(ticker)
  ])
  
  return {
    ticker,
    price: processPriceData(priceData),
    whales: processWhaleData(whaleData),
    sentiment: processSentimentData(sentimentData),
    social: processSocialData(socialData),
    news: processNewsData(newsData)
  }
}

/**
 * Fetch whale activity from whale_transactions table
 */
async function fetchWhaleActivity(ticker: string, supabase: any): Promise<any[]> {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('whale_transactions')
      .select(`
        id,
        transaction_hash,
        token_symbol,
        classification,
        usd_value,
        whale_score,
        blockchain,
        from_address,
        to_address,
        from_label,
        to_label,
        counterparty_type,
        is_cex_transaction,
        reasoning,
        timestamp
      `)
      .eq('token_symbol', ticker.toUpperCase())
      .gte('timestamp', last24Hours)
      .order('usd_value', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('Error fetching whale data:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in fetchWhaleActivity:', error)
    return []
  }
}

/**
 * Fetch sentiment scores
 */
async function fetchSentiment(ticker: string, supabase: any): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sentiment_scores')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('timestamp', { ascending: false })
      .limit(24) // Last 24 hours of sentiment
    
    if (error) {
      console.error('Error fetching sentiment:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in fetchSentiment:', error)
    return []
  }
}

/**
 * Fetch news from LunarCrush /news API endpoint
 * Uses format from API docs: post_title, post_link, post_created (unix timestamp), post_sentiment
 */
async function fetchLunarCrushNews(ticker: string, supabase: any): Promise<void> {
  try {
    const LUNARCRUSH_KEY = process.env.LUNARCRUSH_API_KEY
    if (!LUNARCRUSH_KEY) {
      console.log('⚠️  LunarCrush API key not configured')
      return
    }

    console.log(`📰 Fetching LunarCrush /news for ${ticker}...`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    // Try ticker-specific topic first
    const topicName = ticker.toLowerCase()
    const response = await fetch(
      `https://lunarcrush.com/api4/public/topic/${topicName}/news/v1`,
      {
        headers: { 'Authorization': `Bearer ${LUNARCRUSH_KEY}` },
        signal: controller.signal
      }
    )
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error(`LunarCrush /news API error: ${response.status}`)
      return
    }

    const result = await response.json()
    const articles = result.data || []

    console.log(`📰 Found ${articles.length} LunarCrush /news articles for ${ticker}`)

    // Filter function to check if article is relevant to the crypto
    const isRelevantArticle = (article: any, ticker: string): boolean => {
      const title = (article.post_title || '').toLowerCase()
      const tickerLower = ticker.toLowerCase()
      
      // Common crypto-related keywords
      const cryptoKeywords = ['crypto', 'blockchain', 'bitcoin', 'ethereum', 'defi', 'web3', 'nft', 'token', 'coin', 'trading', 'wallet', 'exchange', 'binance', 'coinbase']
      
      // Check if title contains ticker or crypto keywords
      const hasTicker = title.includes(tickerLower) || title.includes(`$${tickerLower}`)
      const hasCryptoKeyword = cryptoKeywords.some(keyword => title.includes(keyword))
      
      // Exclude obvious non-crypto topics
      const excludeKeywords = ['ozempic', 'healthy returns', 'bridge', 'mail', 'proton', 'bomb', 'war', 'election', 'covid', 'vaccine', 'weather']
      const hasExcludeKeyword = excludeKeywords.some(keyword => title.includes(keyword))
      
      return (hasTicker || hasCryptoKeyword) && !hasExcludeKeyword
    }

    let savedCount = 0
    for (const article of articles.slice(0, 20)) { // Limit to 20
      try {
        const articleUrl = article.post_link || ''
        const articleTitle = article.post_title || 'Untitled'
        
        if (!articleUrl) continue
        
        // Filter out irrelevant articles
        if (!isRelevantArticle(article, ticker)) {
          console.log(`  ⏭️  Skipping irrelevant: "${articleTitle.substring(0, 50)}..."`)
          continue
        }
        
        // Check if exists
        const { data: existing } = await supabase
          .from('news_items')
          .select('id')
          .eq('url', articleUrl)
          .single()
        
        if (!existing) {
          // Convert LunarCrush sentiment (1-5 scale) to our format (-1 to +1)
          // 1=very negative, 3=neutral, 5=very positive
          // Convert: (sentiment - 3) / 2 = -1 to +1
          const sentimentRaw = article.post_sentiment ? 
            (article.post_sentiment - 3) / 2 : null
          
          const { error } = await supabase
            .from('news_items')
            .insert({
              ticker: ticker.toUpperCase(),
              title: articleTitle,
              url: articleUrl,
              source: article.creator_name || 'lunarcrush',
              external_id: article.id?.toString() || articleUrl,
              sentiment_raw: sentimentRaw,
              published_at: new Date(article.post_created * 1000).toISOString(),
              fetched_at: new Date().toISOString(),
              author: article.creator_display_name || article.creator_name || null,
              metadata: {
                post_type: article.post_type,
                post_image: article.post_image,
                creator_followers: article.creator_followers,
                interactions_24h: article.interactions_24h
              }
            })
          
          if (!error) {
            savedCount++
            console.log(`  ✅ Saved: "${articleTitle.substring(0, 50)}..."`)
          } else {
            console.error(`  ❌ Error saving article:`, error)
          }
        }
      } catch (err) {
        console.error('Error processing LunarCrush article:', err)
      }
    }
    
    console.log(`✅ Saved ${savedCount} new LunarCrush /news articles for ${ticker}`)
  } catch (error) {
    console.error('Error fetching LunarCrush /news:', error)
  }
}

/**
 * Fetch fresh news from CryptoPanic API
 */
async function fetchCryptoPanicNews(ticker: string, supabase: any): Promise<void> {
  try {
    const CRYPTOPANIC_TOKEN = process.env.CRYPTOPANIC_API_TOKEN
    if (!CRYPTOPANIC_TOKEN) {
      console.log('⚠️  CryptoPanic API token not configured')
      return
    }

    // Map common tickers to CryptoPanic currency codes (100+ supported)
    const tickerMap: Record<string, string> = {
      // Major coins
      'BTC': 'BTC', 'ETH': 'ETH', 'BNB': 'BNB', 'SOL': 'SOL', 'XRP': 'XRP',
      'ADA': 'ADA', 'AVAX': 'AVAX', 'DOT': 'DOT', 'MATIC': 'MATIC', 'TRX': 'TRX',
      'ATOM': 'ATOM', 'NEAR': 'NEAR', 'ALGO': 'ALGO', 'VET': 'VET', 'FIL': 'FIL',
      'APT': 'APT', 'HBAR': 'HBAR', 'STX': 'STX', 'INJ': 'INJ', 'FTM': 'FTM',
      'LTC': 'LTC', 'BCH': 'BCH', 'ETC': 'ETC', 'XLM': 'XLM', 'ICP': 'ICP',
      
      // Stablecoins
      'USDT': 'USDT', 'USDC': 'USDC', 'DAI': 'DAI', 'BUSD': 'BUSD',
      
      // DeFi
      'UNI': 'UNI', 'LINK': 'LINK', 'AAVE': 'AAVE', 'MKR': 'MKR', 'SNX': 'SNX',
      'CRV': 'CRV', 'COMP': 'COMP', 'YFI': 'YFI', 'SUSHI': 'SUSHI', 'LDO': 'LDO',
      '1INCH': '1INCH', 'DYDX': 'DYDX', 'GMX': 'GMX',
      
      // Layer 2s
      'ARB': 'ARB', 'OP': 'OP', 'IMX': 'IMX', 'LRC': 'LRC',
      
      // Meme coins
      'DOGE': 'DOGE', 'SHIB': 'SHIB', 'PEPE': 'PEPE', 'FLOKI': 'FLOKI',
      'BONK': 'BONK', 'WIF': 'WIF',
      
      // Gaming
      'SAND': 'SAND', 'MANA': 'MANA', 'AXS': 'AXS', 'GALA': 'GALA',
      'ENJ': 'ENJ', 'APE': 'APE',
      
      // AI & Data
      'FET': 'FET', 'GRT': 'GRT', 'RNDR': 'RNDR', 'OCEAN': 'OCEAN',
      
      // Newer
      'SUI': 'SUI', 'SEI': 'SEI', 'TIA': 'TIA', 'JTO': 'JTO'
    }

    const currencyCode = tickerMap[ticker.toUpperCase()] || ticker.toUpperCase()
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_TOKEN}&currencies=${currencyCode}&kind=news&filter=rising`

    console.log(`📰 Fetching CryptoPanic news for ${ticker}...`)
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error(`CryptoPanic API error: ${response.status}`)
      return
    }

    const data = await response.json()
    const articles = data.results || []

    console.log(`📰 Found ${articles.length} CryptoPanic articles for ${ticker}`)

    // Save articles to database
    let savedCount = 0
    for (const article of articles.slice(0, 10)) { // Limit to 10
      try {
        const publishedAt = new Date(article.published_at).toISOString()
        const articleUrl = article.url || ''
        
        if (!articleUrl) continue // Skip if no URL
        
        // Check if article exists
        const { data: existing } = await supabase
          .from('news_items')
          .select('id')
          .eq('url', articleUrl)
          .single()
        
        if (!existing) {
          // Insert new article
          const { error } = await supabase
            .from('news_items')
            .insert({
              ticker: ticker.toUpperCase(),
              title: article.title || 'Untitled',
              url: articleUrl,
              source: article.source?.title || 'cryptopanic',
              external_id: article.id?.toString() || articleUrl,
              sentiment_raw: null,
              published_at: publishedAt,
              fetched_at: new Date().toISOString()
            })
          
          if (!error) savedCount++
        }
      } catch (err) {
        console.error('Error saving CryptoPanic article:', err)
      }
    }
    
    console.log(`✅ Saved ${savedCount} new CryptoPanic articles for ${ticker}`)
  } catch (error) {
    console.error('Error fetching CryptoPanic news:', error)
  }
}

/**
 * Fetch news (ALWAYS fetches fresh from LunarCrush AI + CryptoPanic)
 */
async function fetchNews(ticker: string, supabase: any): Promise<any[]> {
  try {
    // Fetch from ALL THREE sources in parallel
    console.log(`📡 Fetching fresh news for ${ticker} from 3 sources...`)
    await Promise.allSettled([
      fetchFreshLunarCrushData(ticker, supabase),      // LunarCrush AI (with social themes)
      fetchLunarCrushNews(ticker, supabase),           // LunarCrush /news API
      fetchCryptoPanicNews(ticker, supabase)           // CryptoPanic
    ])
    
    console.log(`🔍 Querying database for ${ticker} articles...`)
    
    // Get all articles for this ticker, ordered by when we fetched them
    const { data: newsData, count, error } = await supabase
      .from('news_items')
      .select('*', { count: 'exact' })
      .eq('ticker', ticker.toUpperCase())
      .order('fetched_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error(`❌ Error querying news for ${ticker}:`, error)
      return []
    }
    
    console.log(`✅ Found ${count || 0} total articles for ${ticker}`)
    
    // Log first few articles for debugging
    if (newsData && newsData.length > 0) {
      console.log(`  📰 Sample: "${newsData[0].title.substring(0, 50)}..." from ${newsData[0].source}`)
    }
    
    return newsData || []
  } catch (error) {
    console.error('Error in fetchNews:', error)
    return []
  }
}

/**
 * Fetch price data with enhanced metrics
 */
async function fetchPriceData(ticker: string, supabase: any): Promise<any> {
  try {
    // Get last 24h of snapshots from DB
    const { data: snapshots, error } = await supabase
      .from('price_snapshots')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('timestamp', { ascending: false })
      .limit(96) // Last 24 hours (every 15 min)
    
    if (error) {
      console.error('Error fetching price snapshots:', error)
      return { snapshots: [], current: null, ath: null, atl: null }
    }
    
    // Fetch additional data from CoinGecko (all-time high, all-time low)
    const coinGeckoIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'ADA': 'cardano',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'SHIB': 'shiba-inu',
      'PEPE': 'pepe',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'AVAX': 'avalanche-2',
      'UNI': 'uniswap',
      'LTC': 'litecoin'
    }
    
    const coinId = coinGeckoIds[ticker.toUpperCase()]
    let athData: {
      ath: any
      ath_date: any
      ath_change_percentage: any
      atl: any
      atl_date: any
      atl_change_percentage: any
      market_cap_rank: any
      total_supply: any
      circulating_supply: any
    } | null = null
    
    if (coinId) {
      try {
        const cgResponse = await fetch(
          `https://pro-api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
          {
            headers: { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY || '' }
          }
        )
        
        if (cgResponse.ok) {
          const cgData = await cgResponse.json()
          athData = {
            ath: cgData.market_data?.ath?.usd || null,
            ath_date: cgData.market_data?.ath_date?.usd || null,
            ath_change_percentage: cgData.market_data?.ath_change_percentage?.usd || null,
            atl: cgData.market_data?.atl?.usd || null,
            atl_date: cgData.market_data?.atl_date?.usd || null,
            atl_change_percentage: cgData.market_data?.atl_change_percentage?.usd || null,
            market_cap_rank: cgData.market_cap_rank || null,
            total_supply: cgData.market_data?.total_supply || null,
            circulating_supply: cgData.market_data?.circulating_supply || null
          }
        }
      } catch (cgError) {
        console.error(`Error fetching CoinGecko ATH data for ${ticker}:`, cgError)
      }
    }
    
    return {
      snapshots: snapshots || [],
      current: snapshots?.[0] || null,
      ath: athData
    }
  } catch (error) {
    console.error('Error in fetchPriceData:', error)
    return { snapshots: [], current: null, ath: null }
  }
}

/**
 * Fetch LunarCrush AI data (real-time)
 */
async function fetchLunarCrushAI(ticker: string): Promise<any> {
  try {
    const apiKey = process.env.LUNARCRUSH_API_KEY
    
    if (!apiKey) {
      console.error('LUNARCRUSH_API_KEY not configured')
      return null
    }
    
    const response = await fetch(
      `https://lunarcrush.ai/topic/${ticker.toLowerCase()}`,
      {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/html'
        }
      }
    )
    
    if (!response.ok) {
      console.error(`LunarCrush AI error: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    return parseLunarCrushAI(html)
  } catch (error) {
    console.error('Error in fetchLunarCrushAI:', error)
    return null
  }
}

/**
 * Process whale data into metrics
 */
function processWhaleData(whaleData: any[]): WhaleData {
  if (!whaleData || whaleData.length === 0) {
    return {
      transaction_count: 0,
      total_volume_usd: 0,
      avg_transaction_usd: 0,
      net_flow_24h: 0,
      avg_whale_score: 0,
      cex_transactions: 0,
      dex_transactions: 0,
      accumulation_count: 0,
      distribution_count: 0,
      top_moves: [],
      data_focus: 'ERC20-primary'
    }
  }
  
  // Calculate metrics
  const transaction_count = whaleData.length
  const total_volume_usd = whaleData.reduce((sum, tx) => sum + (tx.usd_value || 0), 0)
  const avg_transaction_usd = total_volume_usd / transaction_count
  
  // Calculate net flow (CEX inflows are negative, outflows are positive)
  let net_flow_24h = 0
  for (const tx of whaleData) {
    if (tx.is_cex_transaction) {
      // From CEX to wallet = accumulation (positive)
      // To CEX from wallet = distribution (negative)
      if (tx.from_label && (tx.from_label.toLowerCase().includes('binance') || 
          tx.from_label.toLowerCase().includes('coinbase') || 
          tx.from_label.toLowerCase().includes('cex'))) {
        net_flow_24h += tx.usd_value || 0
      } else if (tx.to_label && (tx.to_label.toLowerCase().includes('binance') || 
                 tx.to_label.toLowerCase().includes('coinbase') || 
                 tx.to_label.toLowerCase().includes('cex'))) {
        net_flow_24h -= tx.usd_value || 0
      }
    }
  }
  
  const avg_whale_score = whaleData.reduce((sum, tx) => sum + (tx.whale_score || 0), 0) / transaction_count
  const cex_transactions = whaleData.filter(tx => tx.is_cex_transaction).length
  const dex_transactions = whaleData.filter(tx => !tx.is_cex_transaction && tx.counterparty_type === 'DEX').length
  const accumulation_count = whaleData.filter(tx => tx.classification === 'ACCUMULATION').length
  const distribution_count = whaleData.filter(tx => tx.classification === 'DISTRIBUTION').length
  
  // Top 5 largest moves
  const top_moves = whaleData.slice(0, 5).map(tx => ({
    hash: tx.transaction_hash,
    value_usd: tx.usd_value,
    classification: tx.classification,
    from: tx.from_label || truncateAddress(tx.from_address),
    to: tx.to_label || truncateAddress(tx.to_address),
    type: tx.counterparty_type,
    reasoning: tx.reasoning,
    timestamp: tx.timestamp
  }))
  
  return {
    transaction_count,
    total_volume_usd,
    avg_transaction_usd,
    net_flow_24h,
    avg_whale_score,
    cex_transactions,
    dex_transactions,
    accumulation_count,
    distribution_count,
    top_moves,
    data_focus: 'ERC20-primary'
  }
}

/**
 * Process sentiment data
 */
function processSentimentData(sentimentData: any[]): SentimentData {
  if (!sentimentData || sentimentData.length === 0) {
    return {
      current: 0,
      trend: 'Stable',
      news_count: 0,
      confidence: 0,
      provider_sentiment: null,
      llm_sentiment: null
    }
  }
  
  const latest = sentimentData[0]
  
  return {
    current: latest.aggregated_score || 0,
    trend: calculateSentimentTrend(sentimentData),
    news_count: latest.news_count_24h || 0,
    confidence: latest.confidence || 0,
    provider_sentiment: latest.provider_sentiment_avg,
    llm_sentiment: latest.llm_sentiment_avg
  }
}

/**
 * Process social data
 */
function processSocialData(socialData: any): SocialData {
  if (!socialData) {
    return {
      sentiment_pct: null,
      engagement: null,
      mentions: null,
      creators: null,
      supportive_themes: [],
      critical_themes: [],
      top_creators: []
    }
  }
  
  return {
    sentiment_pct: socialData.sentiment_pct,
    engagement: socialData.interactions,
    mentions: socialData.mentions,
    creators: socialData.creators,
    supportive_themes: socialData.supportive_themes || [],
    critical_themes: socialData.critical_themes || [],
    top_creators: socialData.top_creators || []
  }
}

/**
 * Process news data
 */
function processNewsData(newsData: any[]): NewsData {
  return {
    headlines: newsData?.slice(0, 10) || [],
    total_count: newsData?.length || 0
  }
}

/**
 * Process price data
 */
function processPriceData(priceData: any): PriceData {
  // Handle new structure with snapshots and ATH data
  if (!priceData?.snapshots || priceData.snapshots.length === 0) {
    return {
      current: 0,
      change_24h: 0,
      market_cap: 0,
      volume_24h: 0,
      trend: 'No data',
      ath: null,
      ath_date: null,
      ath_distance: null,
      atl: null,
      market_cap_rank: null
    }
  }
  
  const latest = priceData.snapshots[0]
  const athInfo = priceData.ath
  
  // Calculate distance from ATH
  let athDistance: number | null = null
  if (athInfo?.ath && latest?.price_usd) {
    athDistance = ((latest.price_usd - athInfo.ath) / athInfo.ath) * 100
  }
  
  return {
    current: latest.price_usd || 0,
    change_24h: latest.price_change_24h || 0,
    market_cap: latest.market_cap || 0,
    volume_24h: latest.volume_24h || 0,
    trend: formatPriceTrend(priceData.snapshots),
    ath: athInfo?.ath || null,
    ath_date: athInfo?.ath_date || null,
    ath_distance: athDistance,
    atl: athInfo?.atl || null,
    market_cap_rank: athInfo?.market_cap_rank || null
  }
}

/**
 * Build formatted context string for GPT-4.0
 */
export function buildGPTContext(context: OrcaContext, userMessage: string): string {
  return `User question: "${userMessage}"

═══════════════════════════════════════════
CONTEXT FOR ${context.ticker}
═══════════════════════════════════════════

💰 PRICE DATA (CoinGecko):
├─ Current Price: ${formatCurrency(context.price.current)}
├─ 24h Change: ${formatPercentage(context.price.change_24h)}
├─ Market Cap: ${formatCurrency(context.price.market_cap)}
├─ 24h Volume: ${formatCurrency(context.price.volume_24h)}
├─ Trend: ${context.price.trend}
${context.price.ath ? `├─ All-Time High: ${formatCurrency(context.price.ath)}${context.price.ath_date ? ` (${new Date(context.price.ath_date).toLocaleDateString()})` : ''}` : ''}
${context.price.ath_distance !== null ? `├─ Distance from ATH: ${formatPercentage(context.price.ath_distance)} ${context.price.ath_distance < -50 ? '⚠️ DEEP DISCOUNT' : context.price.ath_distance < -30 ? '💡 NOTABLE DISCOUNT' : context.price.ath_distance > -10 ? '🔥 NEAR ATH' : ''}` : ''}
${context.price.market_cap_rank ? `└─ Market Cap Rank: #${context.price.market_cap_rank}` : ''}

🐋 WHALE ACTIVITY (Your Personalized Data - ERC20 Focus):
├─ Data Source: whale_transactions table (blockchain monitoring)
├─ Time Range: Last 24 hours
│
├─ FLOW ANALYSIS:
│  ├─ Net Flow: ${formatCurrency(context.whales.net_flow_24h)} ${formatNetFlowInterpretation(context.whales.net_flow_24h)}
│  ├─ Total Volume: ${formatCurrency(context.whales.total_volume_usd)}
│  ├─ Transaction Count: ${context.whales.transaction_count}
│  └─ Avg Transaction: ${formatCurrency(context.whales.avg_transaction_usd)}
│
├─ ACTIVITY BREAKDOWN:
│  ├─ CEX Transactions: ${context.whales.cex_transactions}
│  ├─ DEX Transactions: ${context.whales.dex_transactions}
│  ├─ Accumulation: ${context.whales.accumulation_count}
│  ├─ Distribution: ${context.whales.distribution_count}
│  └─ Avg Whale Score: ${context.whales.avg_whale_score.toFixed(2)}/10
│
└─ TOP 5 WHALE MOVES:
${formatWhaleMovesDetailed(context.whales.top_moves)}

📊 SENTIMENT ANALYSIS (Multi-Source):
├─ Combined Score: ${context.sentiment.current.toFixed(2)} (-1 bearish to +1 bullish)
├─ Provider Sentiment: ${context.sentiment.provider_sentiment?.toFixed(2) || 'N/A'}
├─ LLM Sentiment (GPT-4o-mini): ${context.sentiment.llm_sentiment?.toFixed(2) || 'N/A'}
├─ Trend: ${context.sentiment.trend}
├─ Confidence: ${(context.sentiment.confidence * 100).toFixed(0)}%
└─ Based on: ${context.sentiment.news_count} news articles (24h)

🌙 SOCIAL INTELLIGENCE (LunarCrush AI - Real-Time):
├─ Social Sentiment: ${context.social.sentiment_pct || 'N/A'}% bullish
├─ Engagement (24h): ${context.social.engagement ? formatLargeNumber(context.social.engagement) : 'N/A'} interactions
├─ Mentions (24h): ${context.social.mentions ? formatLargeNumber(context.social.mentions) : 'N/A'}
├─ Active Creators: ${context.social.creators ? formatLargeNumber(context.social.creators) : 'N/A'}
│
├─ 💚 SUPPORTIVE THEMES:
${formatThemes(context.social.supportive_themes)}
│
└─ ⚠️ CRITICAL THEMES:
${formatThemes(context.social.critical_themes)}

🌍 GLOBAL MARKET CONTEXT:
Consider these broader market factors when analyzing ${context.ticker}:
├─ **Macro Environment**: Interest rates, inflation, Fed policy
├─ **Risk Appetite**: Are investors favoring risky assets or fleeing to safety?
├─ **Geopolitical Events**: Wars, elections, regulatory changes affecting crypto
├─ **Traditional Markets**: Stocks, bonds, dollar strength correlation
├─ **Crypto Market**: Bitcoin dominance, altseason signals, overall sentiment
└─ **Upcoming Catalysts**: ETF decisions, regulations, major protocol upgrades

📰 RECENT NEWS (Top 10):
**Read these headlines carefully and reference specific articles in your analysis!**
${formatNewsHeadlinesDetailed(context.news.headlines.slice(0, 10))}

═══════════════════════════════════════════

INSTRUCTIONS:
1. **Use the 3-PART STRUCTURE** defined in your system prompt (Data → News → Bottom Line)
2. **Report EXACT net flow amounts** - Do NOT say "$0.00" unless net_flow_24h is literally 0. Report the actual value shown above.
3. **Format news as markdown links** - Use [Title](URL) format with the exact URLs provided
4. **READ THE NEWS ARTICLES** above and identify key themes, catalysts, sentiment
5. **Analyze SHORT-TERM impact** (days-weeks) and **LONG-TERM impact** (months-years) of the news
6. **Consider GLOBAL MARKETS**: Fed policy, geopolitics, risk appetite, macro trends
7. **Be specific with numbers** - Don't round to zero, use the actual values
8. **No predictions**: Share insights and data, not financial advice

**CRITICAL DATA ACCURACY:**
- Net Flow above shows: ${formatCurrency(context.whales.net_flow_24h)} - Report this EXACT amount in Part 1
- News URLs are provided - Format as clickable markdown links in Part 2
- Answer the user's specific question in Part 3

User's question: "${userMessage}"`
}

