/**
 * PHASE 1 - CRON JOB 4: Price Snapshots
 * Schedule: Every 15 minutes
 * Purpose: Fetch current prices from CoinGecko
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Top crypto tickers with their CoinGecko IDs
// Must include ALL tokens that compute-signals processes (ALWAYS_INCLUDE + active)
const TICKER_MAP = [
  // Top 20 by market cap
  { symbol: 'BTC', id: 'bitcoin' },
  { symbol: 'ETH', id: 'ethereum' },
  { symbol: 'USDT', id: 'tether' },
  { symbol: 'BNB', id: 'binancecoin' },
  { symbol: 'SOL', id: 'solana' },
  { symbol: 'USDC', id: 'usd-coin' },
  { symbol: 'XRP', id: 'ripple' },
  { symbol: 'ADA', id: 'cardano' },
  { symbol: 'DOGE', id: 'dogecoin' },
  { symbol: 'TRX', id: 'tron' },
  { symbol: 'AVAX', id: 'avalanche-2' },
  { symbol: 'SHIB', id: 'shiba-inu' },
  { symbol: 'DOT', id: 'polkadot' },
  { symbol: 'LINK', id: 'chainlink' },
  { symbol: 'MATIC', id: 'matic-network' },
  { symbol: 'UNI', id: 'uniswap' },
  { symbol: 'LTC', id: 'litecoin' },
  { symbol: 'ATOM', id: 'cosmos' },
  { symbol: 'ETC', id: 'ethereum-classic' },
  { symbol: 'XLM', id: 'stellar' },
  // Infrastructure & L1/L2
  { symbol: 'NEAR', id: 'near' },
  { symbol: 'ALGO', id: 'algorand' },
  { symbol: 'VET', id: 'vechain' },
  { symbol: 'FIL', id: 'filecoin' },
  { symbol: 'APT', id: 'aptos' },
  { symbol: 'HBAR', id: 'hedera-hashgraph' },
  { symbol: 'ARB', id: 'arbitrum' },
  { symbol: 'OP', id: 'optimism' },
  { symbol: 'SUI', id: 'sui' },
  { symbol: 'SEI', id: 'sei-network' },
  { symbol: 'TIA', id: 'celestia' },
  { symbol: 'STX', id: 'blockstack' },
  { symbol: 'INJ', id: 'injective-protocol' },
  { symbol: 'STRK', id: 'starknet' },
  { symbol: 'MNT', id: 'mantle' },
  // DeFi
  { symbol: 'AAVE', id: 'aave' },
  { symbol: 'MKR', id: 'maker' },
  { symbol: 'SNX', id: 'havven' },
  { symbol: 'RUNE', id: 'thorchain' },
  { symbol: 'CRV', id: 'curve-dao-token' },
  { symbol: 'COMP', id: 'compound-governance-token' },
  { symbol: 'LDO', id: 'lido-dao' },
  { symbol: 'PENDLE', id: 'pendle' },
  { symbol: 'ONDO', id: 'ondo-finance' },
  { symbol: 'ENA', id: 'ethena' },
  { symbol: 'EIGEN', id: 'eigenlayer' },
  { symbol: 'SSV', id: 'ssv-network' },
  { symbol: 'ENS', id: 'ethereum-name-service' },
  { symbol: '1INCH', id: '1inch' },
  { symbol: 'SUSHI', id: 'sushi' },
  { symbol: 'CVX', id: 'convex-finance' },
  { symbol: 'FXS', id: 'frax-share' },
  { symbol: 'RPL', id: 'rocket-pool' },
  { symbol: 'YFI', id: 'yearn-finance' },
  { symbol: 'LPT', id: 'livepeer' },
  { symbol: 'GNO', id: 'gnosis' },
  // AI / Data
  { symbol: 'FET', id: 'artificial-superintelligence-alliance' },
  { symbol: 'RENDER', id: 'render-token' },
  { symbol: 'TAO', id: 'bittensor' },
  { symbol: 'NMR', id: 'numeraire' },
  // Gaming & Metaverse
  { symbol: 'GRT', id: 'the-graph' },
  { symbol: 'SAND', id: 'the-sandbox' },
  { symbol: 'MANA', id: 'decentraland' },
  { symbol: 'IMX', id: 'immutable-x' },
  { symbol: 'AXS', id: 'axie-infinity' },
  { symbol: 'GALA', id: 'gala' },
  { symbol: 'ENJ', id: 'enjincoin' },
  { symbol: 'CHZ', id: 'chiliz' },
  { symbol: 'APE', id: 'apecoin' },
  // Memecoins
  { symbol: 'PEPE', id: 'pepe' },
  { symbol: 'WLD', id: 'worldcoin-wld' },
  { symbol: 'WIF', id: 'dogwifcoin' },
  { symbol: 'BONK', id: 'bonk' },
  { symbol: 'FLOKI', id: 'floki' },
  // Infrastructure & Other
  { symbol: 'FTM', id: 'fantom' },
  { symbol: 'DYDX', id: 'dydx' },
  { symbol: 'GMX', id: 'gmx' },
  { symbol: 'BAT', id: 'basic-attention-token' },
  { symbol: 'ZRX', id: '0x' },
  { symbol: 'BLUR', id: 'blur' },
  { symbol: 'LRC', id: 'loopring' },
  { symbol: 'QNT', id: 'quant-network' },
  { symbol: 'MASK', id: 'mask-network' },
  { symbol: 'SKL', id: 'skale' },
  { symbol: 'ANKR', id: 'ankr' },
  { symbol: 'CELO', id: 'celo' },
  { symbol: 'API3', id: 'api3' },
  { symbol: 'MINA', id: 'mina-protocol' },
  { symbol: 'KAS', id: 'kaspa' },
  { symbol: 'PYTH', id: 'pyth-network' },
  { symbol: 'JUP', id: 'jupiter-exchange-solana' },
  { symbol: 'RNDR', id: 'render-token' },
  // Wrapped
  { symbol: 'WBTC', id: 'wrapped-bitcoin' },
  { symbol: 'WETH', id: 'weth' },
]

const BATCH_SIZE = 100 // CoinGecko allows up to 250 IDs per request

interface CoinGeckoPrice {
  usd: number
  usd_market_cap?: number
  usd_24h_vol?: number
  usd_24h_change?: number
}

export async function GET(request: Request) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    // v6: Binance is primary, CoinGecko is fallback (no longer required)

    let totalInserted = 0
    const errors: string[] = []

    // v8 (2026-04-26 ROOT-CAUSE FIX): Binance api.binance.com is geo-blocked
    // from Vercel's serverless region. The previous "Binance primary" path
    // was silently returning 451/403 → empty binancePrices → falling through
    // to CoinGecko fallback BUT only for tokens "not in binancePrices" — which
    // was all of them, so it kinda worked. Then a deeper failure (CG quota
    // or stale CDN response) caused EVERY token to freeze at the same value
    // for 49.8h straight (BTC stuck at $71258 while real BTC was $77981 —
    // 9.4% gap). Diagnosed 2026-04-26 from 49h of identical price_snapshots
    // rows. The whole signal_outcomes table for the period is corrupted.
    //
    // New order: CoinGecko Pro PRIMARY (paid plan, reliable, returns live
    // prices from any region). Binance is used ONLY for taker_buy_pressure
    // enrichment elsewhere. We freshness-check CG response by spot-comparing
    // BTC against the previous snapshot — if identical to 4 decimal places
    // we treat the source as poisoned and surface a hard error instead of
    // silently inserting another stale row.
    const cgPrices: Record<string, any> = {}
    const apiKey = process.env.COINGECKO_API_KEY
    if (!apiKey) {
      errors.push('COINGECKO_API_KEY missing — cannot fetch live prices')
    } else {
      const coinIds = TICKER_MAP.map(t => t.id).join(',')
      try {
        const url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json', 'x-cg-pro-api-key': apiKey },
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) {
          errors.push(`CoinGecko HTTP ${response.status}`)
        } else {
          const data = await response.json()
          for (const ticker of TICKER_MAP) {
            const pd = data[ticker.id]
            if (!pd || !pd.usd) continue
            cgPrices[ticker.symbol] = {
              price: pd.usd,
              market_cap: pd.usd_market_cap || null,
              volume_24h: pd.usd_24h_vol || null,
              price_change_24h: pd.usd_24h_change || null,
            }
          }
        }
      } catch (cgErr) {
        errors.push(`CoinGecko fetch failed: ${cgErr instanceof Error ? cgErr.message : cgErr}`)
      }
    }

    // Stale-source guard: if CG returned the same BTC price as the most
    // recent snapshot to 4 decimal places, the source is poisoned. Refuse
    // to insert another stale row — better to skip a 15-min cycle than
    // poison the dataset further.
    if (cgPrices.BTC?.price) {
      const { data: lastBtc } = await supabase
        .from('price_snapshots')
        .select('price_usd, timestamp')
        .eq('ticker', 'BTC')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastBtc?.price_usd && Math.abs(Number(lastBtc.price_usd) - cgPrices.BTC.price) < 0.0001) {
        const ageMin = (Date.now() - new Date(lastBtc.timestamp).getTime()) / 60000
        // Only treat as stale if the previous snapshot is also recent (< 30m).
        // If the last snapshot is older, identical prices would just mean BTC
        // happens to be at the same level — unusual but not impossible.
        if (ageMin < 30) {
          errors.push(`BTC price unchanged from previous snapshot ($${lastBtc.price_usd}) — source likely stale, aborting insert`)
          return NextResponse.json({
            success: false,
            stale: true,
            errors,
          }, { status: 503 })
        }
      }
    }

    // Insert all live prices
    for (const ticker of TICKER_MAP) {
      const cg = cgPrices[ticker.symbol]
      if (!cg || !cg.price || cg.price <= 0) continue
      try {
        const { error: insertError } = await supabase
          .from('price_snapshots')
          .insert({
            ticker: ticker.symbol,
            timestamp: new Date().toISOString(),
            price_usd: cg.price,
            market_cap: cg.market_cap,
            volume_24h: cg.volume_24h,
            price_change_1h: null,
            price_change_24h: cg.price_change_24h,
            price_change_7d: null,
          })
        if (!insertError) totalInserted++
        else if (!insertError.message.includes('duplicate key')) {
          errors.push(`CG insert ${ticker.symbol}: ${insertError.message}`)
        }
      } catch {}
    }

    console.log(`✅ Price snapshot complete: ${totalInserted} prices inserted for ${TICKER_MAP.length} tokens`)
    
    if (errors.length > 0) {
      console.error(`⚠️ Encountered ${errors.length} errors:`, errors.slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      tokens: TICKER_MAP.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    })

  } catch (error) {
    console.error('Fatal error in price snapshot:', error)
    return NextResponse.json(
      { 
        error: 'Price snapshot failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

