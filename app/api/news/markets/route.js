import { NextResponse } from 'next/server'

/**
 * GET /api/news/markets
 *
 * Powers the News Terminal redesign's dark market rail, ticker marquee, and
 * breaking-hero price chart with REAL data:
 *   - Binance 24hr ticker  → price + 24h open + % change
 *   - Binance 1h klines    → recent close series for sparklines / hero chart
 *   - alternative.me FNG   → the "Sonar Index" (crypto Fear & Greed)
 *
 * Shape:
 *   {
 *     coins: [{ sym, name, price:number, open:number, series:number[] }],
 *     index: { value:number, label:string, delta:number, bar:number } | null,
 *     updated: ISO string
 *   }
 *
 * Server-cached ~10s so the client can poll frequently for a live cadence
 * without hammering Binance.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COINS = [
  { sym: 'BTC', name: 'Bitcoin', symbol: 'BTCUSDT' },
  { sym: 'ETH', name: 'Ethereum', symbol: 'ETHUSDT' },
  { sym: 'SOL', name: 'Solana', symbol: 'SOLUSDT' },
  { sym: 'XRP', name: 'XRP', symbol: 'XRPUSDT' },
  { sym: 'DOGE', name: 'Dogecoin', symbol: 'DOGEUSDT' },
  { sym: 'LINK', name: 'Chainlink', symbol: 'LINKUSDT' },
]

const SERIES_LEN = 26
const BINANCE_HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision']

let cache = null
let cacheTime = 0
const CACHE_TTL = 10_000

let fngCache = null
let fngTime = 0
const FNG_TTL = 10 * 60_000 // Fear/Greed only updates a few times per day.

async function binanceFetch(path) {
  for (const host of BINANCE_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { cache: 'no-store', next: { revalidate: 0 } })
      if (res.ok) return await res.json()
    } catch {
      // try next host
    }
  }
  return null
}

async function fetchCoin(coin) {
  // 24hr ticker → price + open + % change
  const ticker = await binanceFetch(`/api/v3/ticker/24hr?symbol=${coin.symbol}`)
  let price = ticker ? parseFloat(ticker.lastPrice) : NaN
  let open = ticker ? parseFloat(ticker.openPrice) : NaN

  // 1h klines → recent close series for the sparkline
  const klines = await binanceFetch(`/api/v3/klines?symbol=${coin.symbol}&interval=1h&limit=${SERIES_LEN}`)
  let series = []
  if (Array.isArray(klines) && klines.length > 0) {
    series = klines.map((k) => parseFloat(k[4])).filter((n) => Number.isFinite(n))
    if (!Number.isFinite(price)) price = series[series.length - 1]
    if (!Number.isFinite(open)) open = series[0]
  }
  if (!Number.isFinite(price)) return null
  if (!Number.isFinite(open) || open <= 0) open = price
  if (series.length === 0) series = [open, price]
  // Pin the last point to the live price so the sparkline tip matches the quote.
  series[series.length - 1] = price

  return { sym: coin.sym, name: coin.name, price, open, series }
}

function classify(v) {
  if (v < 25) return 'Extreme Fear'
  if (v < 45) return 'Fear'
  if (v <= 55) return 'Neutral'
  if (v <= 75) return 'Greed'
  return 'Extreme Greed'
}

async function fetchIndex() {
  if (fngCache && Date.now() - fngTime < FNG_TTL) return fngCache
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=2', {
      cache: 'no-store',
      next: { revalidate: 0 },
    })
    if (!res.ok) return fngCache
    const json = await res.json()
    const arr = Array.isArray(json?.data) ? json.data : []
    if (arr.length === 0) return fngCache
    const value = parseInt(arr[0].value, 10)
    if (!Number.isFinite(value)) return fngCache
    const prev = arr[1] ? parseInt(arr[1].value, 10) : value
    const index = {
      value,
      label: (arr[0].value_classification || classify(value)).toUpperCase(),
      delta: Number.isFinite(prev) ? value - prev : 0,
      bar: Math.max(0, Math.min(100, value)),
    }
    fngCache = index
    fngTime = Date.now()
    return index
  } catch {
    return fngCache
  }
}

export async function GET() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache)
  }
  try {
    const [coinResults, index] = await Promise.all([
      Promise.all(COINS.map(fetchCoin)),
      fetchIndex(),
    ])
    const coins = coinResults.filter(Boolean)
    if (coins.length === 0 && cache) {
      return NextResponse.json(cache)
    }
    const payload = { coins, index: index || null, updated: new Date().toISOString() }
    cache = payload
    cacheTime = Date.now()
    return NextResponse.json(payload)
  } catch {
    if (cache) return NextResponse.json(cache)
    return NextResponse.json({ coins: [], index: null, updated: new Date().toISOString() }, { status: 500 })
  }
}
