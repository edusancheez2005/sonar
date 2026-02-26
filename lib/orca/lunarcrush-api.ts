/**
 * LunarCrush API Integration
 * Fetches rich market and social data from LunarCrush API
 * 
 * API Key: Set in LUNARCRUSH_API_KEY environment variable
 */

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || 'unxdj7pa1xdr5248gjygdp7rskmjwsn9xonvw1su'
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4'

// In-memory cache to avoid 429 rate limits (5-minute TTL)
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiry) return entry.data as T
  cache.delete(key)
  return null
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

export interface LunarCrushCoinData {
  id: number
  name: string
  symbol: string
  price: number
  price_btc: number
  market_cap: number
  percent_change_24h: number
  percent_change_7d: number  // WoW
  percent_change_30d: number // MoM
  volume_24h: number
  max_supply: number | null
  circulating_supply: number
  galaxy_score: number  // 0-100, LunarCrush proprietary
  alt_rank: number      // Performance vs other assets
  volatility: number    // Standard deviation of price
  market_cap_rank: number
}

export interface LunarCrushTopicData {
  topic: string
  title: string
  sentiment: number           // 0-100%
  interactions_24h: number
  social_contributors: number
  posts_24h: number
  social_dominance: number
  galaxy_score: number
  categories: string[]
  // Time series changes
  interactions_change_24h?: number
  interactions_change_7d?: number
  sentiment_change_24h?: number
}

export interface LunarCrushEnhancedData {
  coin: LunarCrushCoinData | null
  topic: LunarCrushTopicData | null
  fetchedAt: string
}

/**
 * Fetch coin market data from LunarCrush
 * Includes Galaxy Score, Alt Rank, WoW/MoM changes
 */
export async function fetchLunarCrushCoin(symbol: string): Promise<LunarCrushCoinData | null> {
  const cacheKey = `coin:${symbol.toLowerCase()}`
  const cached = getCached<LunarCrushCoinData>(cacheKey)
  if (cached) {
    console.log(`✅ LunarCrush coin data (cached) for ${symbol}`)
    return cached
  }
  try {
    console.log(`📡 Fetching LunarCrush coin data for ${symbol}...`)
    
    const response = await fetch(
      `${LUNARCRUSH_BASE_URL}/public/coins/${symbol.toLowerCase()}/v1`,
      {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      console.error(`LunarCrush coin API error: ${response.status}${response.status === 429 ? ' (rate limited — using cache fallback)' : ''}`)
      return null
    }
    
    const json = await response.json()
    
    if (!json.data) {
      console.log(`No LunarCrush coin data for ${symbol}`)
      return null
    }
    
    console.log(`✅ LunarCrush coin data: Galaxy Score ${json.data.galaxy_score}, Alt Rank ${json.data.alt_rank}`)
    
    const result: LunarCrushCoinData = {
      id: json.data.id,
      name: json.data.name,
      symbol: json.data.symbol,
      price: json.data.price || 0,
      price_btc: json.data.price_btc || 0,
      market_cap: json.data.market_cap || 0,
      percent_change_24h: json.data.percent_change_24h || 0,
      percent_change_7d: json.data.percent_change_7d || 0,
      percent_change_30d: json.data.percent_change_30d || 0,
      volume_24h: json.data.volume_24h || 0,
      max_supply: json.data.max_supply,
      circulating_supply: json.data.circulating_supply || 0,
      galaxy_score: json.data.galaxy_score || 0,
      alt_rank: json.data.alt_rank || 0,
      volatility: json.data.volatility || 0,
      market_cap_rank: json.data.market_cap_rank || 0
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`Error fetching LunarCrush coin data for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch topic social data from LunarCrush
 * Includes sentiment, social metrics, themes
 */
export async function fetchLunarCrushTopic(symbol: string): Promise<LunarCrushTopicData | null> {
  const cacheKey = `topic:${symbol.toLowerCase()}`
  const cached = getCached<LunarCrushTopicData>(cacheKey)
  if (cached) {
    console.log(`✅ LunarCrush topic data (cached) for ${symbol}`)
    return cached
  }
  try {
    console.log(`📡 Fetching LunarCrush topic data for ${symbol}...`)
    
    const response = await fetch(
      `${LUNARCRUSH_BASE_URL}/public/topic/${symbol.toLowerCase()}/v1`,
      {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      console.error(`LunarCrush topic API error: ${response.status}${response.status === 429 ? ' (rate limited)' : ''}`)
      return null
    }
    
    const json = await response.json()
    
    if (!json.data) {
      console.log(`No LunarCrush topic data for ${symbol}`)
      return null
    }
    
    const data = json.data
    
    console.log(`✅ LunarCrush topic data: Sentiment ${data.sentiment}%, Interactions ${data.interactions_24h}`)
    
    const result: LunarCrushTopicData = {
      topic: data.topic || symbol.toLowerCase(),
      title: data.title || symbol,
      sentiment: data.sentiment || 0,
      interactions_24h: data.interactions_24h || data.interactions || 0,
      social_contributors: data.social_contributors || data.contributors || 0,
      posts_24h: data.posts_24h || data.posts || 0,
      social_dominance: data.social_dominance || 0,
      galaxy_score: data.galaxy_score || 0,
      categories: data.categories || [],
      interactions_change_24h: data.interactions_change_24h,
      interactions_change_7d: data.interactions_change_7d,
      sentiment_change_24h: data.sentiment_change_24h
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`Error fetching LunarCrush topic data for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch all LunarCrush data for a token
 * Combines coin market data and topic social data
 */
export async function fetchLunarCrushEnhanced(symbol: string): Promise<LunarCrushEnhancedData> {
  const [coin, topic] = await Promise.all([
    fetchLunarCrushCoin(symbol),
    fetchLunarCrushTopic(symbol)
  ])
  
  return {
    coin,
    topic,
    fetchedAt: new Date().toISOString()
  }
}

/**
 * Format Galaxy Score with interpretation
 */
export function interpretGalaxyScore(score: number): string {
  if (score >= 80) return `${score} (Excellent - Strong social/price correlation)`
  if (score >= 60) return `${score} (Good - Above average momentum)`
  if (score >= 40) return `${score} (Neutral - Average performance)`
  if (score >= 20) return `${score} (Weak - Below average signals)`
  return `${score} (Very Weak - Poor social/price metrics)`
}

/**
 * Format Alt Rank with interpretation
 */
export function interpretAltRank(rank: number): string {
  if (rank <= 10) return `#${rank} (Top 10 - Exceptional performance vs peers)`
  if (rank <= 50) return `#${rank} (Top 50 - Strong relative performance)`
  if (rank <= 100) return `#${rank} (Top 100 - Above average)`
  if (rank <= 250) return `#${rank} (Mid-tier - Average performance)`
  return `#${rank} (Lower tier - Underperforming vs peers)`
}

/**
 * Format percentage change with direction
 */
export function formatChange(value: number, period: string): string {
  const sign = value >= 0 ? '+' : ''
  const emoji = value >= 5 ? '📈' : value <= -5 ? '📉' : '➡️'
  return `${sign}${value.toFixed(2)}% ${period}`
}
