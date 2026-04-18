import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','TONUSDT']
const LABELS  = ['BTC','ETH','SOL','XRP','BNB','DOGE','ADA','AVAX','LINK','TON']

let cache = null
let cacheTime = 0

export async function GET() {
  // Cache for 15 seconds
  if (cache && Date.now() - cacheTime < 15000) {
    return NextResponse.json(cache)
  }

  try {
    const results = await Promise.all(
      SYMBOLS.map(s =>
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`, { next: { revalidate: 15 } })
          .then(r => r.json())
      )
    )

    const tickers = results.map((t, i) => {
      const price = parseFloat(t.lastPrice)
      const change = parseFloat(t.priceChangePercent)
      const fmtPrice = price >= 1000
        ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : price >= 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(3)}`
      return {
        sym: LABELS[i],
        price: fmtPrice,
        delta: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        up: change >= 0,
      }
    })

    cache = tickers
    cacheTime = Date.now()
    return NextResponse.json(tickers)
  } catch (err) {
    return NextResponse.json([], { status: 500 })
  }
}
