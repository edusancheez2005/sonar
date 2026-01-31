/**
 * CoinGecko Pro API Client
 * Centralized client with caching, rate limiting, and error handling
 */

const BASE_URL = 'https://pro-api.coingecko.com/api/v3'
const API_KEY = process.env.COINGECKO_API_KEY

if (!API_KEY) {
  console.warn('⚠️ COINGECKO_API_KEY not set - CoinGecko features will be limited')
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// In-memory cache (consider Redis for production)
const cache = new Map<string, CacheEntry<any>>()

interface FetchOptions {
  cacheTTL?: number // seconds
  retries?: number
  retryDelay?: number // ms
}

/**
 * Core fetch wrapper with caching and retries
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    cacheTTL = 60, // 1 minute default
    retries = 3,
    retryDelay = 1000
  } = options

  const cacheKey = `cg:${endpoint}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cacheTTL * 1000) {
    return cached.data
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `${BASE_URL}${endpoint}`
      const separator = endpoint.includes('?') ? '&' : '?'
      const fullUrl = `${url}${separator}x_cg_pro_api_key=${API_KEY}`

      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`CoinGecko API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // Cache successful response
      cache.set(cacheKey, { data, timestamp: Date.now() })

      return data
    } catch (error) {
      lastError = error as Error
      console.error(`CoinGecko API attempt ${attempt + 1}/${retries} failed:`, error)

      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('CoinGecko API request failed')
}

/**
 * Get list of all coins (with optional filters)
 */
interface CoinListItem {
  id: string
  symbol: string
  name: string
  platforms?: Record<string, string>
}

export async function getCoinsList(includeInactive = false) {
  const endpoint = includeInactive 
    ? '/coins/list?include_platform=true&status=inactive'
    : '/coins/list?include_platform=true'
  
  return fetchWithRetry<CoinListItem[]>(endpoint, { cacheTTL: 3600 }) // 1 hour
}

/**
 * Get detailed coin data by ID
 */
export async function getCoinById(
  coinId: string,
  options: {
    localization?: boolean
    tickers?: boolean
    market_data?: boolean
    community_data?: boolean
    developer_data?: boolean
    sparkline?: boolean
  } = {}
) {
  const params = new URLSearchParams({
    localization: String(options.localization ?? false),
    tickers: String(options.tickers ?? false),
    market_data: String(options.market_data ?? true),
    community_data: String(options.community_data ?? false),
    developer_data: String(options.developer_data ?? false),
    sparkline: String(options.sparkline ?? false),
  })

  return fetchWithRetry<any>(`/coins/${coinId}?${params}`, { cacheTTL: 120 })
}

/**
 * Get simple price data for multiple coins
 */
export async function getSimplePrice(
  ids: string[],
  options: {
    include_market_cap?: boolean
    include_24hr_vol?: boolean
    include_24hr_change?: boolean
    include_last_updated_at?: boolean
  } = {}
) {
  const params = new URLSearchParams({
    ids: ids.join(','),
    vs_currencies: 'usd',
    include_market_cap: String(options.include_market_cap ?? true),
    include_24hr_vol: String(options.include_24hr_vol ?? true),
    include_24hr_change: String(options.include_24hr_change ?? true),
    include_last_updated_at: String(options.include_last_updated_at ?? true),
  })

  return fetchWithRetry<Record<string, any>>(`/simple/price?${params}`, { cacheTTL: 60 })
}

/**
 * Get coins market data (bulk)
 */
export async function getCoinsMarkets(
  options: {
    vs_currency?: string
    ids?: string[]
    category?: string
    order?: string
    per_page?: number
    page?: number
    sparkline?: boolean
    price_change_percentage?: string
  } = {}
) {
  const params = new URLSearchParams({
    vs_currency: options.vs_currency ?? 'usd',
    order: options.order ?? 'market_cap_desc',
    per_page: String(options.per_page ?? 100),
    page: String(options.page ?? 1),
    sparkline: String(options.sparkline ?? false),
  })

  if (options.ids) params.set('ids', options.ids.join(','))
  if (options.category) params.set('category', options.category)
  if (options.price_change_percentage) {
    params.set('price_change_percentage', options.price_change_percentage)
  }

  return fetchWithRetry<any[]>(`/coins/markets?${params}`, { cacheTTL: 120 })
}

/**
 * Search for coins, exchanges, categories
 */
export async function search(query: string) {
  return fetchWithRetry<{
    coins: Array<{
      id: string
      name: string
      symbol: string
      market_cap_rank: number
      thumb: string
      large: string
    }>
    exchanges: any[]
    categories: any[]
    nfts: any[]
  }>(`/search?query=${encodeURIComponent(query)}`, { cacheTTL: 300 })
}

/**
 * Get market chart data (line chart)
 */
export async function getMarketChart(
  coinId: string,
  days: number | 'max' = 7,
  interval: 'daily' | 'hourly' = 'daily'
) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: String(days),
    interval: interval === 'hourly' ? 'hourly' : 'daily',
  })

  return fetchWithRetry<{
    prices: [number, number][]
    market_caps: [number, number][]
    total_volumes: [number, number][]
  }>(`/coins/${coinId}/market_chart?${params}`, { cacheTTL: 300 })
}

/**
 * Get OHLC data (candlestick chart)
 */
export async function getOHLC(coinId: string, days: number = 7) {
  return fetchWithRetry<[number, number, number, number, number][]>(
    `/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
    { cacheTTL: 300 }
  )
}

/**
 * Get historical data for specific date
 */
export async function getHistory(coinId: string, date: string) {
  return fetchWithRetry<any>(
    `/coins/${coinId}/history?date=${date}&localization=false`,
    { cacheTTL: 86400 } // 24 hours
  )
}

/**
 * Get trending coins
 */
export async function getTrending() {
  return fetchWithRetry<{
    coins: Array<{
      item: {
        id: string
        coin_id: number
        name: string
        symbol: string
        market_cap_rank: number
        thumb: string
        small: string
        large: string
        slug: string
        price_btc: number
        score: number
      }
    }>
    exchanges: any[]
  }>('/search/trending', { cacheTTL: 300 })
}

/**
 * Get top gainers and losers
 */
export async function getTopGainersLosers(
  vs_currency = 'usd',
  duration: '1h' | '24h' | '7d' | '14d' | '30d' | '60d' | '1y' = '24h'
) {
  return fetchWithRetry<{
    top_gainers: any[]
    top_losers: any[]
  }>(`/coins/top_gainers_losers?vs_currency=${vs_currency}&duration=${duration}`, { cacheTTL: 300 })
}

/**
 * Get list of all exchanges
 */
export async function getExchangesList() {
  return fetchWithRetry<Array<{
    id: string
    name: string
  }>>('/exchanges/list', { cacheTTL: 86400 }) // 24 hours
}

/**
 * Get detailed exchange data by ID
 */
export async function getExchangeById(exchangeId: string) {
  return fetchWithRetry<any>(`/exchanges/${exchangeId}`, { cacheTTL: 3600 })
}

/**
 * Get token info by contract address
 */
export async function getTokenInfoByContract(
  assetPlatform: string,
  contractAddress: string
) {
  return fetchWithRetry<any>(
    `/coins/${assetPlatform}/contract/${contractAddress}`,
    { cacheTTL: 600 }
  )
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}
