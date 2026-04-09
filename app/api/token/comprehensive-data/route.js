import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Legacy CoinGecko ID mappings (kept only for backward compat with coinGeckoId field)
const SYMBOL_TO_COINGECKO_ID = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'USDC': 'usd-coin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOGE': 'dogecoin',
  'TRX': 'tron',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'SHIB': 'shiba-inu',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'BCH': 'bitcoin-cash',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'FIL': 'filecoin',
  'IMX': 'immutable-x',
  'PEPE': 'pepe',
  'GRT': 'the-graph',
  'AAVE': 'aave',
  'MKR': 'maker',
  'SNX': 'synthetix-network-token',
  'CRV': 'curve-dao-token',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'FTM': 'fantom',
  'ALGO': 'algorand',
  'EOS': 'eos',
  'XLM': 'stellar',
  'HBAR': 'hedera-hashgraph',
  'VET': 'vechain',
  'ICP': 'internet-computer',
  'QNT': 'quant-network',
  'RUNE': 'thorchain',
  'THETA': 'theta-token',
  'AXS': 'axie-infinity',
  'FLOW': 'flow',
  'XTZ': 'tezos',
  'EGLD': 'elrond-erd-2',
  'KLAY': 'klay-token',
  'CAKE': 'pancakeswap-token',
  'COMP': 'compound-governance-token',
  'SUSHI': 'sushi',
  'YFI': 'yearn-finance',
  'BAT': 'basic-attention-token',
  'ZRX': '0x',
  'ENJ': 'enjincoin',
  'CHZ': 'chiliz',
  'GALA': 'gala',
  'ONE': 'harmony',
  'ZIL': 'zilliqa',
  'WAVES': 'waves',
  'ICX': 'icon',
  'CELO': 'celo',
  'QTUM': 'qtum',
  'BAL': 'balancer',
  'RVN': 'ravencoin',
  '1INCH': '1inch',
  'LRC': 'loopring',
  'ROSE': 'oasis-network',
  'ANKR': 'ankr',
  'AUDIO': 'audius',
  'STORJ': 'storj',
  'SKL': 'skale',
  'REN': 'republic-protocol',
  'CELR': 'celer-network',
  'OGN': 'origin-protocol',
  'NMR': 'numeraire',
  'FET': 'fetch-ai',
  'OCEAN': 'ocean-protocol',
  'API3': 'api3',
  'BAND': 'band-protocol',
  'GLM': 'golem',
  'INJ': 'injective-protocol',
  'DYDX': 'dydx',
  'PERP': 'perpetual-protocol',
  'GMX': 'gmx',
  'BLUR': 'blur',
  'LDO': 'lido-dao',
  'RPL': 'rocket-pool',
  'PENDLE': 'pendle',
  'RNDR': 'render-token',
  'WLD': 'worldcoin-wld',
  'MASK': 'mask-network',
  'PYTH': 'pyth-network',
  'SUI': 'sui',
  'SEI': 'sei-network',
  'TIA': 'celestia',
  'JUP': 'jupiter-exchange-solana',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
  'FLOKI': 'floki',
  'TAO': 'bittensor',
  'STX': 'blockstack',
  'MINA': 'mina-protocol',
  'KAS': 'kaspa',
  'RAY': 'raydium',
  'JTO': 'jito-governance-token',
  'W': 'wormhole',
  'STRK': 'starknet',
  'ENA': 'ethena',
  'ORDI': 'ordinals',
  'TRB': 'tellor',
  'SUPER': 'superfarm',
  'PRIME': 'echelon-prime',
  'AGIX': 'singularitynet'
}

const getPct = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback
  return 0
}

export async function GET(req) {
  try {
    const ip = getClientIp(req)
    const rl = rateLimit(`token-data:${ip}`, 60, 60000)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol || !/^[A-Z0-9]{1,10}$/.test(symbol)) {
      return NextResponse.json({ error: 'Symbol must be 1-10 alphanumeric characters' }, { status: 400 })
    }

    const coinGeckoId = SYMBOL_TO_COINGECKO_ID[symbol]
    
    // Initialize response object
    const response = {
      symbol,
      coinGeckoId,
      price: null,
      marketData: null,
      whaleData: null,
      socialData: null,
      technicalData: null,
      news: null
    }

    // 1. Get Binance price data + CoinGecko metadata in parallel
    const PAIR_MAP = { WBTC: 'BTCUSDT', WETH: 'ETHUSDT', MATIC: 'POLUSDT' }
    const pair = PAIR_MAP[symbol] || `${symbol}USDT`
    const cgId = coinGeckoId || symbol.toLowerCase()
    try {
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
        fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true`,
          { signal: AbortSignal.timeout(8000) }
        ).catch(() => null),
      ])

      let cg = null
      try { if (cgRes?.ok) cg = await cgRes.json() } catch {}
      const md = cg?.market_data || {}

      if (ticker24hRes?.ok) {
        const t = await ticker24hRes.json()
        const klines7d = klines7dRes?.ok ? await klines7dRes.json() : []
        const klines30d = klines30dRes?.ok ? await klines30dRes.json() : []

        const computeChange = (klines) => {
          if (!klines || klines.length < 2) return 0
          const openFirst = parseFloat(klines[0][1])
          const closeLast = parseFloat(klines[klines.length - 1][4])
          return openFirst > 0 ? ((closeLast - openFirst) / openFirst) * 100 : 0
        }

        const vol24 = parseFloat(t.quoteVolume) || 0
        const mcap = md.market_cap?.usd || 0

        response.marketData = {
          current_price: parseFloat(t.lastPrice) || 0,
          market_cap: mcap,
          market_cap_rank: cg?.market_cap_rank || null,
          fully_diluted_valuation: md.fully_diluted_valuation?.usd || 0,
          total_volume_24h: vol24,
          volume_to_market_cap_ratio: mcap ? ((vol24 / mcap) * 100).toFixed(2) : 0,
          circulating_supply: md.circulating_supply || 0,
          total_supply: md.total_supply || 0,
          max_supply: md.max_supply || null,
          price_change_24h: parseFloat(t.priceChange) || 0,
          price_change_percentage_24h: parseFloat(t.priceChangePercent) || 0,
          price_change_percentage_7d: computeChange(klines7d) || getPct(md.price_change_percentage_7d_in_currency?.usd, md.price_change_percentage_7d),
          price_change_percentage_30d: computeChange(klines30d) || getPct(md.price_change_percentage_30d_in_currency?.usd, md.price_change_percentage_30d),
          price_change_percentage_1y: getPct(md.price_change_percentage_1y_in_currency?.usd, md.price_change_percentage_1y),
          ath: md.ath?.usd || 0, ath_date: md.ath_date?.usd || null, ath_change_percentage: md.ath_change_percentage?.usd || 0,
          atl: md.atl?.usd || 0, atl_date: md.atl_date?.usd || null, atl_change_percentage: md.atl_change_percentage?.usd || 0,
          high_24h: parseFloat(t.highPrice) || 0,
          low_24h: parseFloat(t.lowPrice) || 0,
          homepage: cg?.links?.homepage?.[0] || null,
          blockchain_site: cg?.links?.blockchain_site?.filter(s => s)?.[0] || null,
          official_forum_url: cg?.links?.official_forum_url?.filter(s => s)?.[0] || null,
          chat_url: cg?.links?.chat_url?.filter(s => s)?.[0] || null,
          announcement_url: cg?.links?.announcement_url?.filter(s => s)?.[0] || null,
          twitter_screen_name: cg?.links?.twitter_screen_name || null,
          facebook_username: cg?.links?.facebook_username || null,
          telegram_channel_identifier: cg?.links?.telegram_channel_identifier || null,
          subreddit_url: cg?.links?.subreddit_url || null,
          repos_url: cg?.links?.repos_url?.github?.[0] || null,
          description: cg?.description?.en || null,
          categories: cg?.categories || [],
          contract_address: cg?.contract_address || null,
          asset_platform_id: cg?.asset_platform_id || null,
          sentiment_votes_up_percentage: cg?.sentiment_votes_up_percentage || 0,
          sentiment_votes_down_percentage: cg?.sentiment_votes_down_percentage || 0,
          developer_data: {
            forks: cg?.developer_data?.forks || 0, stars: cg?.developer_data?.stars || 0,
            subscribers: cg?.developer_data?.subscribers || 0, total_issues: cg?.developer_data?.total_issues || 0,
            closed_issues: cg?.developer_data?.closed_issues || 0, pull_requests_merged: cg?.developer_data?.pull_requests_merged || 0,
            pull_request_contributors: cg?.developer_data?.pull_request_contributors || 0, commit_count_4_weeks: cg?.developer_data?.commit_count_4_weeks || 0
          },
          community_data: {
            twitter_followers: cg?.community_data?.twitter_followers || 0, reddit_subscribers: cg?.community_data?.reddit_subscribers || 0,
            reddit_accounts_active_48h: cg?.community_data?.reddit_accounts_active_48h || 0, telegram_channel_user_count: cg?.community_data?.telegram_channel_user_count || 0
          },
          tickers: (cg?.tickers || []).slice(0, 10).map(tk => ({
            exchange: tk.market?.name || 'Unknown', pair: tk.base + '/' + tk.target,
            price: tk.last || 0, volume: tk.volume || 0,
            bid_ask_spread: tk.bid_ask_spread_percentage || 0, trust_score: tk.trust_score || 'unknown',
            last_traded: tk.last_traded_at || null
          }))
        }

        response.price = response.marketData.current_price
      }
    } catch (err) {
      console.error('Data fetch error:', err)
    }

    // 2. Get Whale Transaction Data from our DB
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: whaleTxs, error: whaleError } = await supabaseAdmin
        .from('all_whale_transactions')
        .select('*')
        .eq('token_symbol', symbol)
        .gte('timestamp', since24h)
        .order('timestamp', { ascending: false })

      if (!whaleError && whaleTxs) {
        const buys = whaleTxs.filter(t => t.classification?.toUpperCase() === 'BUY')
        const sells = whaleTxs.filter(t => t.classification?.toUpperCase() === 'SELL')
        
        const buyVolume = buys.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
        const sellVolume = sells.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
        
        response.whaleData = {
          total_transactions: whaleTxs.length,
          buy_count: buys.length,
          sell_count: sells.length,
          buy_volume: buyVolume,
          sell_volume: sellVolume,
          net_flow: buyVolume - sellVolume,
          total_volume: buyVolume + sellVolume,
          unique_whales: new Set(whaleTxs.map(t => t.from_address)).size,
          avg_transaction_size: whaleTxs.length > 0
            ? whaleTxs.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0) / whaleTxs.length
            : 0,
          largest_transaction: whaleTxs.length > 0
            ? Math.max(...whaleTxs.map(t => Number(t.usd_value) || 0))
            : 0,
          recent_transactions: whaleTxs.slice(0, 10).map(t => ({
            hash: t.transaction_hash,
            type: t.classification,
            value: Number(t.usd_value) || 0,
            timestamp: t.timestamp,
            blockchain: t.blockchain,
            whale_score: t.whale_score
          }))
        }
      }
    } catch (err) {
      console.error('Whale data error:', err)
    }

    // 3. Get CryptoPanic News
    try {
      const newsRes = await fetch(
        `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${process.env.CRYPTOPANIC_API_KEY}&currencies=${symbol}&kind=news`,
        { next: { revalidate: 300 } }
      )

      if (newsRes.ok) {
        const newsData = await newsRes.json()
        response.news = (newsData.results || []).slice(0, 10).map(article => ({
          title: article.title,
          published_at: article.published_at,
          source: article.source?.title || 'Unknown',
          url: article.url || article.original_url || `https://cryptopanic.com/news/${article.id}`,
          votes: article.votes,
          sentiment: article.votes?.positive > article.votes?.negative ? 'positive' : 'negative'
        }))
      }
    } catch (err) {
      console.error('News API error:', err)
    }

    // 4. Technical Indicators (basic)
    if (response.marketData) {
      const md = response.marketData
      response.technicalData = {
        // Simple momentum indicators
        is_near_ath: md.ath_change_percentage > -10,
        is_near_atl: md.atl_change_percentage < 10,
        is_overbought_24h: md.price_change_percentage_24h > 20,
        is_oversold_24h: md.price_change_percentage_24h < -20,
        
        // Volume analysis
        high_volume: md.volume_to_market_cap_ratio > 10,
        
        // Price position
        price_position_24h: md.high_24h && md.low_24h
          ? ((md.current_price - md.low_24h) / (md.high_24h - md.low_24h) * 100).toFixed(2)
          : null,
        
        // Trend
        short_term_trend: md.price_change_percentage_24h > 0 ? 'bullish' : 'bearish',
        medium_term_trend: md.price_change_percentage_7d > 0 ? 'bullish' : 'bearish',
        long_term_trend: md.price_change_percentage_30d > 0 ? 'bullish' : 'bearish'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Comprehensive data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

