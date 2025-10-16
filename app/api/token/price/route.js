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
  'MANA': 'decentraland'
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

    return NextResponse.json({
      symbol: symbol,
      name: data.name,
      image: data.image?.large || data.image?.small,
      price: data.market_data?.current_price?.usd || 0,
      change24h: data.market_data?.price_change_percentage_24h || 0,
      change7d: data.market_data?.price_change_percentage_7d || 0,
      high24h: data.market_data?.high_24h?.usd || 0,
      low24h: data.market_data?.low_24h?.usd || 0,
      marketCap: data.market_data?.market_cap?.usd || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      circulatingSupply: data.market_data?.circulating_supply || 0,
      totalSupply: data.market_data?.total_supply || 0,
      athPrice: data.market_data?.ath?.usd || 0,
      athDate: data.market_data?.ath_date?.usd || null,
      atlPrice: data.market_data?.atl?.usd || 0,
      atlDate: data.market_data?.atl_date?.usd || null
    })
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

