import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAIRS = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'XRPUSDT', label: 'XRP' },
  { symbol: 'BNBUSDT', label: 'BNB' },
  { symbol: 'DOGEUSDT', label: 'DOGE' },
  { symbol: 'ADAUSDT', label: 'ADA' },
  { symbol: 'AVAXUSDT', label: 'AVAX' },
  { symbol: 'LINKUSDT', label: 'LINK' },
  { symbol: 'SUIUSDT', label: 'SUI' },
]

let cache = null
let cacheTime = 0

function formatPrice(p) {
  if (p >= 10000) return `$${Math.round(p).toLocaleString('en-US')}`
  if (p >= 1000) return `$${p.toFixed(2)}`
  if (p >= 1) return `$${p.toFixed(2)}`
  if (p >= 0.01) return `$${p.toFixed(3)}`
  return `$${p.toFixed(4)}`
}

async function fetchOne(pair) {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair.symbol}`)
    if (!res.ok) return null
    const t = await res.json()
    const price = parseFloat(t.lastPrice)
    const change = parseFloat(t.priceChangePercent)
    if (isNaN(price) || isNaN(change)) return null
    return {
      sym: pair.label,
      price: formatPrice(price),
      delta: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      up: change >= 0,
    }
  } catch {
    return null
  }
}

export async function GET() {
  if (cache && Date.now() - cacheTime < 15000) {
    return NextResponse.json(cache)
  }

  try {
    const results = await Promise.all(PAIRS.map(fetchOne))
    const tickers = results.filter(Boolean)
    if (tickers.length > 0) {
      cache = tickers
      cacheTime = Date.now()
    }
    return NextResponse.json(tickers.length > 0 ? tickers : cache || [])
  } catch {
    return NextResponse.json(cache || [], { status: 500 })
  }
}
