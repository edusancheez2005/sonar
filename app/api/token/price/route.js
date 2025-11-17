import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'MATIC': 'matic-network',
  'DOT': 'polkadot',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'AAVE': 'aave',
  'SNX': 'havven',
  'CRV': 'curve-dao-token',
  'MKR': 'maker',
  'COMP': 'compound-governance-token',
  'SUSHI': 'sushi',
  'GRT': 'the-graph',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'FTM': 'fantom',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'FIL': 'filecoin',
  'APE': 'apecoin',
  'LDO': 'lido-dao',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'FRAX': 'frax',
  'TUSD': 'true-usd',
  'GUSD': 'gemini-dollar',
  'LUSD': 'liquity-usd',
  'BAT': 'basic-attention-token',
  'ENJ': 'enjincoin',
  'CHZ': 'chiliz',
  'ZRX': '0x',
  'OMG': 'omisego',
  'LRC': 'loopring',
  'FET': 'fetch-ai',
  'OCEAN': 'ocean-protocol',
  'INJ': 'injective-protocol',
  'IMX': 'immutable-x',
  'BLUR': 'blur',
  'PEPE': 'pepe',
  'FLOKI': 'floki',
  'GALA': 'gala',
  'APT': 'aptos',
  'OP': 'optimism',
  'ARB': 'arbitrum',
  'RNDR': 'render-token',
  'RPL': 'rocket-pool',
  'BEL': 'bella-protocol',
  'API3': 'api3',
  'ILV': 'illuvium',
  'ANKR': 'ankr',
  '1INCH': '1inch',
  'NMR': 'numeraire',
  'ALPHA': 'alpha-finance',
  'METIS': 'metis-token',
  'SLP': 'smooth-love-potion',
  'TLM': 'alien-worlds',
  'AUDIO': 'audius',
  'ENS': 'ethereum-name-service',
  'TEMPLE': 'temple',
  'HEGIC': 'hegic',
  'RADAR': 'dappradar',
  'CELR': 'celer-network',
  'STRK': 'strike',
  'REVV': 'revv',
  'REQ': 'request-network',
  'LPT': 'livepeer',
  'QNT': 'quant-network',
  'CRO': 'crypto-com-chain',
  'AGIX': 'singularitynet',
  'ALICE': 'my-neighbor-alice',
  'STETH': 'staked-ether',
  'WSTETH': 'wrapped-steth',
  'WETH': 'weth',
  'WBNB': 'wbnb',
  'BUSD': 'binance-usd',
  'CAKE': 'pancakeswap-token',
  'XLM': 'stellar',
  'VET': 'vechain',
  'TRX': 'tron',
  'ETC': 'ethereum-classic',
  'BCH': 'bitcoin-cash',
  'LTC': 'litecoin',
  'NEAR': 'near',
  'HBAR': 'hedera-hashgraph',
  'LEO': 'leo-token',
  'QNT': 'quant-network',
  'TON': 'the-open-network',
  'STX': 'blockstack',
  'RUNE': 'thorchain',
  'EGLD': 'elrond-erd-2',
  'FLOW': 'flow',
  'ICP': 'internet-computer',
  'THETA': 'theta-token',
  'SAND': 'the-sandbox',
  'AXS': 'axie-infinity',
  'MANA': 'decentraland',
  // Top 50+ tokens by market cap
  'XMR': 'monero',
  'BSV': 'bitcoin-sv',
  'KLAY': 'klaytn',
  'USDD': 'usdd',
  'TUSD': 'true-usd',
  'DASH': 'dash',
  'ZEC': 'zcash',
  'NEO': 'neo',
  'IOTA': 'iota',
  'WAVES': 'waves',
  'XTZ': 'tezos',
  'EOS': 'eos',
  'KCS': 'kucoin-shares',
  'HT': 'huobi-token',
  'OKB': 'okb',
  'MIOTA': 'iota',
  'BTT': 'bittorrent',
  'HOT': 'holochain',
  'ZIL': 'zilliqa',
  'TFUEL': 'theta-fuel',
  'DCR': 'decred',
  'RVN': 'ravencoin',
  'XEM': 'nem',
  'ONT': 'ontology',
  'SC': 'siacoin',
  'DGB': 'digibyte',
  'NANO': 'nano',
  'LSK': 'lisk',
  'QTUM': 'qtum',
  'ICX': 'icon',
  'DYDX': 'dydx',
  'RUNE': 'thorchain',
  'GMT': 'stepn',
  'CHZ': 'chiliz',
  'ONE': 'harmony',
  'CELO': 'celo',
  'XDC': 'xdce-crowd-sale',
  'KAVA': 'kava',
  'FLUX': 'zelcash',
  'ROSE': 'oasis-network',
  'WOO': 'woo-network',
  'GLMR': 'moonbeam',
  'CTSI': 'cartesi',
  'SUI': 'sui',
  'SEI': 'sei-network',
  'BEAM': 'beam-2',
  'JUP': 'jupiter-exchange-solana',
  'WLD': 'worldcoin-wld',
  'PYTH': 'pyth-network',
  'BONK': 'bonk',
  'ORDI': 'ordinals',
  'SATS': '1000sats',
  'TIA': 'celestia',
  'STRK': 'starknet',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'ONDO': 'ondo-finance',
  'PENDLE': 'pendle',
  'JTO': 'jito-governance-token'
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    // Get CoinGecko ID
    let cgId = SYMBOL_TO_COINGECKO_ID[symbol] || symbol.toLowerCase()

    // Fetch from CoinGecko
    let res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      {
        headers: {
          'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    // If not found, try searching by symbol
    if (!res.ok && res.status === 404) {
      const searchRes = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${symbol}`,
        {
          headers: {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
          }
        }
      )
      
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const coin = searchData.coins?.find(c => 
          c.symbol?.toUpperCase() === symbol
        )
        
        if (coin) {
          cgId = coin.id
          // Retry with the found ID
          res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&community_data=false&developer_data=false`,
            {
              headers: {
                'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
              },
              next: { revalidate: 60 }
            }
          )
        }
      }
    }

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }

    const data = await res.json()

    const getPct = (value, fallback = 0) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback
      return 0
    }

    const change24h = getPct(
      data.market_data?.price_change_percentage_24h_in_currency?.usd,
      data.market_data?.price_change_percentage_24h
    )
    const change7d = getPct(
      data.market_data?.price_change_percentage_7d_in_currency?.usd,
      data.market_data?.price_change_percentage_7d
    )
    const change30d = getPct(
      data.market_data?.price_change_percentage_30d_in_currency?.usd,
      data.market_data?.price_change_percentage_30d
    )
    const change1y = getPct(
      data.market_data?.price_change_percentage_1y_in_currency?.usd,
      data.market_data?.price_change_percentage_1y
    )

    const currentPrice = data.market_data?.current_price?.usd || 0
    const high24 = data.market_data?.high_24h?.usd || 0
    const low24 = data.market_data?.low_24h?.usd || 0
    const marketCap = data.market_data?.market_cap?.usd || 0
    const volume24 = data.market_data?.total_volume?.usd || 0
    const volumeToMc =
      data.market_data?.total_volume?.usd && data.market_data?.market_cap?.usd
        ? (data.market_data.total_volume.usd / data.market_data.market_cap.usd) * 100
        : 0

    const response = {
      symbol,
      name: data.name,
      image: data.image?.large || data.image?.small || data.image?.thumb || null,
      
      price: currentPrice,
      price_change_percentage_24h: change24h,
      price_change_percentage_7d: change7d,
      price_change_percentage_30d: change30d,
      price_change_percentage_1y: change1y,
      change24h,
      change7d,
      change30d,
      change1y,
      
      high_24h: high24,
      low_24h: low24,
      range_position_24h: high24 && low24 && high24 !== low24
        ? ((currentPrice - low24) / (high24 - low24) * 100).toFixed(2)
        : null,
      
      market_cap: marketCap,
      marketCap: marketCap,
      marketCapRank: data.market_cap_rank || 0,
      fullyDilutedValuation: data.market_data?.fully_diluted_valuation?.usd || 0,
      volume_24h: volume24,
      volume24h: volume24,
      volume_to_market_cap_ratio: Number(volumeToMc.toFixed(2)),
      volumeMarketCapRatio: volumeToMc,
      
      circulatingSupply: data.market_data?.circulating_supply || 0,
      totalSupply: data.market_data?.total_supply || 0,
      maxSupply: data.market_data?.max_supply || null,
      
      ath: data.market_data?.ath?.usd || 0,
      athPrice: data.market_data?.ath?.usd || 0,
      athDate: data.market_data?.ath_date?.usd || null,
      ath_change_percentage: data.market_data?.ath_change_percentage?.usd || 0,
      athChangePercentage: data.market_data?.ath_change_percentage?.usd || 0,
      atl: data.market_data?.atl?.usd || 0,
      atlPrice: data.market_data?.atl?.usd || 0,
      atlDate: data.market_data?.atl_date?.usd || null,
      atl_change_percentage: data.market_data?.atl_change_percentage?.usd || 0,
      atlChangePercentage: data.market_data?.atl_change_percentage?.usd || 0,
      
      description: data.description?.en || '',
      homepage: data.links?.homepage?.[0] || '',
      blockchainSite: data.links?.blockchain_site?.filter(Boolean)?.[0] || '',
      twitterHandle: data.links?.twitter_screen_name || '',
      subredditUrl: data.links?.subreddit_url || '',
      githubRepo: data.links?.repos_url?.github?.[0] || '',
      
      marketCapChangePercentage24h: data.market_data?.market_cap_change_percentage_24h || 0,
      
      sentimentVotesUpPercentage: data.sentiment_votes_up_percentage || 0,
      sentimentVotesDownPercentage: data.sentiment_votes_down_percentage || 0,
      
      genesisDate: data.genesis_date || null,
      categories: data.categories || [],
      lastUpdated: data.last_updated || null
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

