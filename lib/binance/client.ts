/**
 * Binance Public API Client
 * No API key required — all endpoints are public market data
 * Replaces CoinGecko for: prices, OHLC, market charts, trending
 * Rate limits: 6,000 weight/min (spot), 2,400 weight/min (futures)
 */

const SPOT_BASE = 'https://data-api.binance.vision'
const SPOT_FALLBACK = 'https://api.binance.com'
const FUTURES_BASE = 'https://fapi.binance.com'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()

interface FetchOptions {
  cacheTTL?: number
  retries?: number
  retryDelay?: number
  isFutures?: boolean
}

async function binanceFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    cacheTTL = 60,
    retries = 2,
    retryDelay = 500,
    isFutures = false,
  } = options

  const cacheKey = `bn:${endpoint}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cacheTTL * 1000) {
    return cached.data
  }

  const bases = isFutures
    ? [FUTURES_BASE]
    : [SPOT_BASE, SPOT_FALLBACK]

  let lastError: Error | null = null

  for (const base of bases) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(`${base}${endpoint}`, {
          headers: { 'Accept': 'application/json' },
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Binance API ${response.status}: ${text}`)
        }

        const data = await response.json()
        cache.set(cacheKey, { data, timestamp: Date.now() })
        return data

      } catch (error) {
        lastError = error as Error
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)))
        }
      }
    }
  }

  throw lastError || new Error('Binance API request failed')
}

// ─── SPOT MARKET DATA ────────────────────────────────

/**
 * Kline/Candlestick data — replaces CoinGecko OHLC + market chart
 * Weight: 2 per call
 */
export async function getKlines(
  symbol: string,
  interval: string = '4h',
  limit: number = 500,
  startTime?: number,
  endTime?: number,
): Promise<BinanceKline[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(limit, 1000)),
  })
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))

  const raw = await binanceFetch<any[][]>(
    `/api/v3/klines?${params}`,
    { cacheTTL: interval === '1m' ? 10 : interval === '1h' ? 30 : 60 }
  )

  return raw.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
    quoteVolume: parseFloat(k[7]),
    trades: k[8],
    takerBuyBaseVol: parseFloat(k[9]),
    takerBuyQuoteVol: parseFloat(k[10]),
  }))
}

/**
 * 24hr ticker stats — replaces CoinGecko coins/markets
 * Weight: 80 for all symbols
 */
export async function get24hrTicker(symbol?: string): Promise<Binance24hrTicker[]> {
  const endpoint = symbol
    ? `/api/v3/ticker/24hr?symbol=${symbol}`
    : '/api/v3/ticker/24hr'

  const data = await binanceFetch<any>(endpoint, { cacheTTL: 30 })
  const arr = Array.isArray(data) ? data : [data]

  return arr.map(t => ({
    symbol: t.symbol,
    priceChange: parseFloat(t.priceChange),
    priceChangePercent: parseFloat(t.priceChangePercent),
    weightedAvgPrice: parseFloat(t.weightedAvgPrice),
    lastPrice: parseFloat(t.lastPrice),
    volume: parseFloat(t.volume),
    quoteVolume: parseFloat(t.quoteVolume),
    openPrice: parseFloat(t.openPrice),
    highPrice: parseFloat(t.highPrice),
    lowPrice: parseFloat(t.lowPrice),
    count: t.count,
  }))
}

/**
 * Rolling window ticker — custom timeframe price changes
 * Weight: 4 per symbol
 */
export async function getRollingTicker(
  symbols: string[],
  windowSize: string = '1d'
): Promise<BinanceRollingTicker[]> {
  const params = new URLSearchParams({
    symbols: JSON.stringify(symbols),
    windowSize,
  })

  const data = await binanceFetch<any[]>(
    `/api/v3/ticker?${params}`,
    { cacheTTL: 30 }
  )

  return data.map(t => ({
    symbol: t.symbol,
    priceChange: parseFloat(t.priceChange),
    priceChangePercent: parseFloat(t.priceChangePercent),
    lastPrice: parseFloat(t.lastPrice),
    volume: parseFloat(t.volume),
    quoteVolume: parseFloat(t.quoteVolume),
  }))
}

/**
 * Current prices — lightest endpoint
 * Weight: 4 for all symbols
 */
export async function getPriceTicker(symbol?: string): Promise<BinancePriceTicker[]> {
  const endpoint = symbol
    ? `/api/v3/ticker/price?symbol=${symbol}`
    : '/api/v3/ticker/price'

  const data = await binanceFetch<any>(endpoint, { cacheTTL: 15 })
  const arr = Array.isArray(data) ? data : [data]
  return arr.map(t => ({ symbol: t.symbol, price: parseFloat(t.price) }))
}

/**
 * Order book depth
 * Weight: 5 (limit 1-100)
 */
export async function getDepth(symbol: string, limit: number = 20) {
  const data = await binanceFetch<any>(
    `/api/v3/depth?symbol=${symbol}&limit=${limit}`,
    { cacheTTL: 10 }
  )
  return {
    bids: data.bids.map((b: string[]) => ({ price: parseFloat(b[0]), qty: parseFloat(b[1]) })),
    asks: data.asks.map((a: string[]) => ({ price: parseFloat(a[0]), qty: parseFloat(a[1]) })),
  }
}

// ─── FUTURES DERIVATIVES DATA ────────────────────────

/**
 * Funding rate history
 * Weight: shared 500 req/5min
 */
export async function getFundingRate(symbol?: string, limit: number = 100) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (symbol) params.set('symbol', symbol)

  return binanceFetch<BinanceFundingRate[]>(
    `/fapi/v1/fundingRate?${params}`,
    { cacheTTL: 300, isFutures: true }
  )
}

/**
 * Open interest (current)
 * Weight: 1
 */
export async function getOpenInterest(symbol: string) {
  return binanceFetch<{ symbol: string; openInterest: string; time: number }>(
    `/fapi/v1/openInterest?symbol=${symbol}`,
    { cacheTTL: 60, isFutures: true }
  )
}

/**
 * Top trader long/short ratio (positions)
 * Weight: ~1
 */
export async function getTopTraderRatio(symbol: string, period: string = '5m', limit: number = 30) {
  return binanceFetch<any[]>(
    `/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=${period}&limit=${limit}`,
    { cacheTTL: 60, isFutures: true }
  )
}

/**
 * Taker buy/sell volume
 * Weight: ~1
 */
export async function getTakerBuySellVolume(symbol: string, period: string = '5m', limit: number = 30) {
  return binanceFetch<any[]>(
    `/futures/data/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=${limit}`,
    { cacheTTL: 60, isFutures: true }
  )
}

/**
 * Premium index (funding + mark price for all symbols)
 * Weight: 10
 */
export async function getPremiumIndex(symbol?: string) {
  const endpoint = symbol
    ? `/fapi/v1/premiumIndex?symbol=${symbol}`
    : '/fapi/v1/premiumIndex'
  return binanceFetch<any>(endpoint, { cacheTTL: 60, isFutures: true })
}

// ─── TYPES ───────────────────────────────────────────

export interface BinanceKline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBaseVol: number
  takerBuyQuoteVol: number
}

export interface Binance24hrTicker {
  symbol: string
  priceChange: number
  priceChangePercent: number
  weightedAvgPrice: number
  lastPrice: number
  volume: number
  quoteVolume: number
  openPrice: number
  highPrice: number
  lowPrice: number
  count: number
}

export interface BinanceRollingTicker {
  symbol: string
  priceChange: number
  priceChangePercent: number
  lastPrice: number
  volume: number
  quoteVolume: number
}

export interface BinancePriceTicker {
  symbol: string
  price: number
}

export interface BinanceFundingRate {
  symbol: string
  fundingRate: string
  fundingTime: number
  markPrice: string
}
