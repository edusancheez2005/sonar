import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Token display names
const TOKEN_NAMES = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana',
  XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche',
  DOT: 'Polkadot', LINK: 'Chainlink', UNI: 'Uniswap', ATOM: 'Cosmos',
  LTC: 'Litecoin', FIL: 'Filecoin', NEAR: 'NEAR Protocol', APT: 'Aptos',
  ARB: 'Arbitrum', OP: 'Optimism', AAVE: 'Aave', MKR: 'Maker',
  CRV: 'Curve', SNX: 'Synthetix', COMP: 'Compound', SUSHI: 'SushiSwap',
  ALGO: 'Algorand', FTM: 'Fantom', SAND: 'The Sandbox', MANA: 'Decentraland',
  AXS: 'Axie Infinity', GRT: 'The Graph', SHIB: 'Shiba Inu', PEPE: 'Pepe',
  WLD: 'Worldcoin', SUI: 'Sui', SEI: 'Sei', TIA: 'Celestia',
  INJ: 'Injective', STX: 'Stacks', IMX: 'Immutable', RENDER: 'Render',
  FET: 'Fetch.ai', JUP: 'Jupiter', WIF: 'dogwifhat', BONK: 'Bonk',
  FLOKI: 'Floki', JASMY: 'JasmyCoin', ENA: 'Ethena', PENDLE: 'Pendle',
  TAO: 'Bittensor', ONDO: 'Ondo', TRX: 'Tron', TON: 'Toncoin',
  ETC: 'Ethereum Classic', XLM: 'Stellar', HBAR: 'Hedera', VET: 'VeChain',
  ICP: 'Internet Computer', THETA: 'Theta', RUNE: 'THORChain', ENS: 'ENS',
  MATIC: 'Polygon', POL: 'Polygon', WBTC: 'Wrapped Bitcoin', WETH: 'Wrapped Ether',
}

export async function GET(req) {
  try {
    const ip = getClientIp(req)
    const rl = rateLimit(`token-price:${ip}`, 60, 60000)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol || !/^[A-Z0-9]{1,10}$/.test(symbol)) {
      return NextResponse.json({ error: 'Symbol must be 1-10 alphanumeric characters' }, { status: 400 })
    }

    // Map to Binance pair
    const pair = symbol === 'WBTC' ? 'BTCUSDT' : symbol === 'WETH' ? 'ETHUSDT' : `${symbol}USDT`

    // Fetch Binance 24hr ticker + 7d/30d klines in parallel
    const [ticker24hRes, klines7dRes, klines30dRes] = await Promise.all([
      fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${pair}`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&limit=7`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&limit=30`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
    ])

    if (!ticker24hRes || !ticker24hRes.ok) {
      return NextResponse.json(
        { error: `Token ${symbol} not available`, symbol, price: null },
        { status: 404 }
      )
    }

    const t = await ticker24hRes.json()
    const klines7d = klines7dRes?.ok ? await klines7dRes.json() : []
    const klines30d = klines30dRes?.ok ? await klines30dRes.json() : []

    const currentPrice = parseFloat(t.lastPrice) || 0
    const high24 = parseFloat(t.highPrice) || 0
    const low24 = parseFloat(t.lowPrice) || 0
    const volume24 = parseFloat(t.quoteVolume) || 0
    const change24h = parseFloat(t.priceChangePercent) || 0

    // Compute 7d and 30d change from klines
    const computeChange = (klines) => {
      if (!klines || klines.length < 2) return 0
      const openFirst = parseFloat(klines[0][1])
      const closeLast = parseFloat(klines[klines.length - 1][4])
      return openFirst > 0 ? ((closeLast - openFirst) / openFirst) * 100 : 0
    }

    const change7d = computeChange(klines7d)
    const change30d = computeChange(klines30d)

    const response = {
      symbol,
      name: TOKEN_NAMES[symbol] || symbol,
      image: null, // Frontend uses TokenIcon component

      price: currentPrice,
      price_change_percentage_24h: change24h,
      price_change_percentage_7d: change7d,
      price_change_percentage_30d: change30d,
      price_change_percentage_1y: 0,
      change24h,
      change7d,
      change30d,
      change1y: 0,

      high_24h: high24,
      low_24h: low24,
      range_position_24h: high24 && low24 && high24 !== low24
        ? ((currentPrice - low24) / (high24 - low24) * 100).toFixed(2)
        : null,

      market_cap: 0,
      marketCap: 0,
      marketCapRank: 0,
      fullyDilutedValuation: 0,
      volume_24h: volume24,
      volume24h: volume24,
      volume_to_market_cap_ratio: 0,
      volumeMarketCapRatio: 0,

      circulatingSupply: 0,
      totalSupply: 0,
      maxSupply: null,

      ath: 0,
      athPrice: 0,
      athDate: null,
      ath_change_percentage: 0,
      athChangePercentage: 0,
      atl: 0,
      atlPrice: 0,
      atlDate: null,
      atl_change_percentage: 0,
      atlChangePercentage: 0,

      description: '',
      homepage: '',
      blockchainSite: '',
      twitterHandle: '',
      subredditUrl: '',
      githubRepo: '',

      marketCapChangePercentage24h: 0,

      sentimentVotesUpPercentage: 0,
      sentimentVotesDownPercentage: 0,
      watchlistUsers: 0,

      // Community data (not available from Binance)
      redditSubscribers: 0,
      redditActive48h: 0,
      telegramUsers: 0,

      // Developer data (not available from Binance)
      githubCommits4w: 0,
      githubStars: 0,
      githubForks: 0,
      githubPRsMerged: 0,

      genesisDate: null,
      categories: [],
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch price data',
        message: error.message,
        symbol: null,
        price: null
      },
      { status: 500 }
    )
  }
}

