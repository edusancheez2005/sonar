import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// CoinGecko ID mappings
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
  'MASK': 'mask-network'
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
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

    // 1. Get CoinGecko comprehensive data
    if (coinGeckoId) {
      try {
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true`,
          {
            headers: {
              'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
            }
          }
        )

        if (cgRes.ok) {
          const cgData = await cgRes.json()
          
          response.marketData = {
            // Price & Market Cap
            current_price: cgData.market_data?.current_price?.usd || 0,
            market_cap: cgData.market_data?.market_cap?.usd || 0,
            market_cap_rank: cgData.market_cap_rank || null,
            fully_diluted_valuation: cgData.market_data?.fully_diluted_valuation?.usd || 0,
            
            // Volume
            total_volume_24h: cgData.market_data?.total_volume?.usd || 0,
            volume_to_market_cap_ratio: cgData.market_data?.total_volume?.usd && cgData.market_data?.market_cap?.usd
              ? (cgData.market_data.total_volume.usd / cgData.market_data.market_cap.usd * 100).toFixed(2)
              : 0,
            
            // Supply
            circulating_supply: cgData.market_data?.circulating_supply || 0,
            total_supply: cgData.market_data?.total_supply || 0,
            max_supply: cgData.market_data?.max_supply || null,
            
            // Price Changes
            price_change_24h: cgData.market_data?.price_change_24h || 0,
            price_change_percentage_24h: cgData.market_data?.price_change_percentage_24h || 0,
            price_change_percentage_7d: cgData.market_data?.price_change_percentage_7d || 0,
            price_change_percentage_30d: cgData.market_data?.price_change_percentage_30d || 0,
            price_change_percentage_1y: cgData.market_data?.price_change_percentage_1y || 0,
            
            // All-Time Data
            ath: cgData.market_data?.ath?.usd || 0,
            ath_date: cgData.market_data?.ath_date?.usd || null,
            ath_change_percentage: cgData.market_data?.ath_change_percentage?.usd || 0,
            atl: cgData.market_data?.atl?.usd || 0,
            atl_date: cgData.market_data?.atl_date?.usd || null,
            atl_change_percentage: cgData.market_data?.atl_change_percentage?.usd || 0,
            
            // High/Low
            high_24h: cgData.market_data?.high_24h?.usd || 0,
            low_24h: cgData.market_data?.low_24h?.usd || 0,
            
            // Links & Info
            homepage: cgData.links?.homepage?.[0] || null,
            blockchain_site: cgData.links?.blockchain_site?.filter(s => s)?.[0] || null,
            official_forum_url: cgData.links?.official_forum_url?.filter(s => s)?.[0] || null,
            chat_url: cgData.links?.chat_url?.filter(s => s)?.[0] || null,
            announcement_url: cgData.links?.announcement_url?.filter(s => s)?.[0] || null,
            twitter_screen_name: cgData.links?.twitter_screen_name || null,
            facebook_username: cgData.links?.facebook_username || null,
            telegram_channel_identifier: cgData.links?.telegram_channel_identifier || null,
            subreddit_url: cgData.links?.subreddit_url || null,
            repos_url: cgData.links?.repos_url?.github?.[0] || null,
            
            // Description
            description: cgData.description?.en || null,
            
            // Categories
            categories: cgData.categories || [],
            
            // Contract Addresses
            contract_address: cgData.contract_address || null,
            asset_platform_id: cgData.asset_platform_id || null,
            
            // Sentiment
            sentiment_votes_up_percentage: cgData.sentiment_votes_up_percentage || 0,
            sentiment_votes_down_percentage: cgData.sentiment_votes_down_percentage || 0,
            
            // Developer Data
            developer_data: {
              forks: cgData.developer_data?.forks || 0,
              stars: cgData.developer_data?.stars || 0,
              subscribers: cgData.developer_data?.subscribers || 0,
              total_issues: cgData.developer_data?.total_issues || 0,
              closed_issues: cgData.developer_data?.closed_issues || 0,
              pull_requests_merged: cgData.developer_data?.pull_requests_merged || 0,
              pull_request_contributors: cgData.developer_data?.pull_request_contributors || 0,
              commit_count_4_weeks: cgData.developer_data?.commit_count_4_weeks || 0
            },
            
            // Community Data
            community_data: {
              twitter_followers: cgData.community_data?.twitter_followers || 0,
              reddit_subscribers: cgData.community_data?.reddit_subscribers || 0,
              reddit_accounts_active_48h: cgData.community_data?.reddit_accounts_active_48h || 0,
              telegram_channel_user_count: cgData.community_data?.telegram_channel_user_count || 0
            },
            
            // Market Tickers (exchanges)
            tickers: (cgData.tickers || []).slice(0, 10).map(t => ({
              exchange: t.market?.name || 'Unknown',
              pair: t.base + '/' + t.target,
              price: t.last || 0,
              volume: t.volume || 0,
              bid_ask_spread: t.bid_ask_spread_percentage || 0,
              trust_score: t.trust_score || 'unknown',
              last_traded: t.last_traded_at || null
            }))
          }

          response.price = response.marketData.current_price
        }
      } catch (err) {
        console.error('CoinGecko API error:', err)
      }
    }

    // 2. Get Whale Transaction Data from our DB
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: whaleTxs, error: whaleError } = await supabaseAdmin
        .from('whale_transactions')
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

