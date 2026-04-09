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

// CoinGecko IDs for metadata (market cap, supply, ATH/ATL, description, links)
// Free tier only — no API key needed for /coins/{id} endpoint
const COINGECKO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
  DOT: 'polkadot', LINK: 'chainlink', UNI: 'uniswap', ATOM: 'cosmos',
  LTC: 'litecoin', FIL: 'filecoin', NEAR: 'near', APT: 'aptos',
  ARB: 'arbitrum', OP: 'optimism', AAVE: 'aave', MKR: 'maker',
  CRV: 'curve-dao-token', SNX: 'havven', COMP: 'compound-governance-token',
  SUSHI: 'sushi', ALGO: 'algorand', FTM: 'fantom', SAND: 'the-sandbox',
  MANA: 'decentraland', AXS: 'axie-infinity', GRT: 'the-graph',
  SHIB: 'shiba-inu', PEPE: 'pepe', WLD: 'worldcoin-wld', SUI: 'sui',
  SEI: 'sei-network', TIA: 'celestia', INJ: 'injective-protocol',
  STX: 'blockstack', IMX: 'immutable-x', RENDER: 'render-token',
  FET: 'artificial-superintelligence-alliance', JUP: 'jupiter-exchange-solana',
  WIF: 'dogwifcoin', BONK: 'bonk', FLOKI: 'floki', JASMY: 'jasmycoin',
  ENA: 'ethena', PENDLE: 'pendle', TAO: 'bittensor', ONDO: 'ondo-finance',
  TRX: 'tron', TON: 'the-open-network', ETC: 'ethereum-classic',
  XLM: 'stellar', HBAR: 'hedera-hashgraph', VET: 'vechain',
  ICP: 'internet-computer', THETA: 'theta-token', RUNE: 'thorchain',
  ENS: 'ethereum-name-service', MATIC: 'matic-network', POL: 'matic-network',
  WBTC: 'wrapped-bitcoin', WETH: 'weth',
  LDO: 'lido-dao', DYDX: 'dydx', GMX: 'gmx', BAT: 'basic-attention-token',
  ZRX: '0x', BLUR: 'blur', LRC: 'loopring', ENJ: 'enjincoin', CHZ: 'chiliz',
  APE: 'apecoin', GALA: 'gala',
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

    // Map to Binance pair (handle rebrands)
    const PAIR_MAP = { WBTC: 'BTCUSDT', WETH: 'ETHUSDT', MATIC: 'POLUSDT' }
    const pair = PAIR_MAP[symbol] || `${symbol}USDT`

    // CoinGecko ID for metadata (market cap, supply, ATH, links)
    const cgId = COINGECKO_IDS[symbol] || symbol.toLowerCase()

    // Fetch Binance price data + CoinGecko metadata in parallel
    const [ticker24hRes, klines7dRes, klines30dRes, cgRes] = await Promise.all([
      fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${pair}`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&limit=7`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&limit=30`, {
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      // CoinGecko free tier — metadata only (market cap, supply, ATH/ATL, links)
      fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&community_data=true&developer_data=true`,
        { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
      ).catch(() => null),
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

    // Parse CoinGecko metadata (graceful — all fields default to 0/null if CG fails)
    let cg = null
    try {
      if (cgRes && cgRes.ok) cg = await cgRes.json()
    } catch {}

    const md = cg?.market_data || {}
    const getPct = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0

    const response = {
      symbol,
      name: cg?.name || TOKEN_NAMES[symbol] || symbol,
      image: cg?.image?.large || cg?.image?.small || null,

      // Prices from Binance (real-time, authoritative)
      price: currentPrice,
      price_change_percentage_24h: change24h,
      price_change_percentage_7d: change7d || getPct(md.price_change_percentage_7d),
      price_change_percentage_30d: change30d || getPct(md.price_change_percentage_30d),
      price_change_percentage_1y: getPct(md.price_change_percentage_1y),
      change24h,
      change7d: change7d || getPct(md.price_change_percentage_7d),
      change30d: change30d || getPct(md.price_change_percentage_30d),
      change1y: getPct(md.price_change_percentage_1y),

      // High/low from Binance
      high_24h: high24,
      high24h: high24,
      low_24h: low24,
      low24h: low24,
      range_position_24h: high24 && low24 && high24 !== low24
        ? ((currentPrice - low24) / (high24 - low24) * 100).toFixed(2)
        : null,

      // Market cap & supply from CoinGecko (Binance doesn't have these)
      market_cap: md.market_cap?.usd || 0,
      marketCap: md.market_cap?.usd || 0,
      marketCapRank: cg?.market_cap_rank || 0,
      fullyDilutedValuation: md.fully_diluted_valuation?.usd || 0,
      volume_24h: volume24,
      volume24h: volume24,
      volume_to_market_cap_ratio: (volume24 && md.market_cap?.usd)
        ? Number(((volume24 / md.market_cap.usd) * 100).toFixed(2))
        : 0,
      volumeMarketCapRatio: (volume24 && md.market_cap?.usd)
        ? (volume24 / md.market_cap.usd) * 100
        : 0,

      circulatingSupply: md.circulating_supply || 0,
      totalSupply: md.total_supply || 0,
      maxSupply: md.max_supply || null,

      // ATH/ATL from CoinGecko
      ath: md.ath?.usd || 0,
      athPrice: md.ath?.usd || 0,
      athDate: md.ath_date?.usd || null,
      ath_change_percentage: md.ath_change_percentage?.usd || 0,
      athChangePercentage: md.ath_change_percentage?.usd || 0,
      atl: md.atl?.usd || 0,
      atlPrice: md.atl?.usd || 0,
      atlDate: md.atl_date?.usd || null,
      atl_change_percentage: md.atl_change_percentage?.usd || 0,
      atlChangePercentage: md.atl_change_percentage?.usd || 0,

      // Links & description from CoinGecko
      description: cg?.description?.en || '',
      homepage: cg?.links?.homepage?.[0] || '',
      blockchainSite: cg?.links?.blockchain_site?.filter(Boolean)?.[0] || '',
      twitterHandle: cg?.links?.twitter_screen_name || '',
      subredditUrl: cg?.links?.subreddit_url || '',
      githubRepo: cg?.links?.repos_url?.github?.[0] || '',

      marketCapChangePercentage24h: md.market_cap_change_percentage_24h || 0,

      sentimentVotesUpPercentage: cg?.sentiment_votes_up_percentage || 0,
      sentimentVotesDownPercentage: cg?.sentiment_votes_down_percentage || 0,
      watchlistUsers: cg?.watchlist_portfolio_users || 0,

      // Community data from CoinGecko
      redditSubscribers: cg?.community_data?.reddit_subscribers || 0,
      redditActive48h: cg?.community_data?.reddit_accounts_active_48h || 0,
      telegramUsers: cg?.community_data?.telegram_channel_user_count || 0,

      // Developer data from CoinGecko
      githubCommits4w: cg?.developer_data?.commit_count_4_weeks || 0,
      githubStars: cg?.developer_data?.stars || 0,
      githubForks: cg?.developer_data?.forks || 0,
      githubPRsMerged: cg?.developer_data?.pull_requests_merged || 0,

      genesisDate: cg?.genesis_date || null,
      categories: cg?.categories || [],
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

