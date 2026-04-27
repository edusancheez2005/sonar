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

    // v9 (2026-04-27): Diagnosed that Vercel's COINGECKO_API_KEY environment
    // variable is a different (likely demo/expired) key than the one in
    // local .env.local. Vercel's CG returns stale values stuck at $71258 BTC
    // for days, while local CG returns live $76842. Verified by hitting the
    // deployed endpoint with the cron secret — response shape confirms new
    // code IS deployed, but the upstream data IS the problem.
    //
    // Switched primary to data-api.binance.vision (Cloudflare-fronted public
    // Binance read mirror — free, no key, returns ALL ~3570 USDT pairs in
    // one call, proven to work from any region including Vercel serverless).
    // CoinGecko stays as enrichment for market_cap (Binance doesn't provide).
    //
    // History:
    //   v6: Binance api.binance.com primary (geo-blocked from Vercel — 49h freeze)
    //   v8 (2026-04-26): CoinGecko primary (Vercel CG key returned stale data)
    //   v9 (2026-04-27): data-api.binance.vision primary, CoinGecko enrichment
    const livePrices: Record<string, { price: number; volume_24h?: number; price_change_24h?: number; market_cap?: number | null }> = {}

    // 1. PRIMARY: data-api.binance.vision — full ticker list (one call)
    try {
      const priceRes = await fetch(
        'https://data-api.binance.vision/api/v3/ticker/price',
        { signal: AbortSignal.timeout(10000) }
      )
      if (priceRes.ok) {
        const all: { symbol: string; price: string }[] = await priceRes.json()
        for (const p of all) {
          if (!p.symbol.endsWith('USDT')) continue
          const ticker = p.symbol.replace('USDT', '')
          const price = parseFloat(p.price)
          if (price > 0) livePrices[ticker] = { price }
        }
      } else {
        errors.push(`data-api.binance.vision /price HTTP ${priceRes.status}`)
      }

      // 24h ticker for volume + change
      const t24Res = await fetch(
        'https://data-api.binance.vision/api/v3/ticker/24hr',
        { signal: AbortSignal.timeout(15000) }
      )
      if (t24Res.ok) {
        const all24: any[] = await t24Res.json()
        for (const t of all24) {
          if (!t.symbol.endsWith('USDT')) continue
          const ticker = t.symbol.replace('USDT', '')
          if (livePrices[ticker]) {
            livePrices[ticker].volume_24h = parseFloat(t.quoteVolume) || 0
            livePrices[ticker].price_change_24h = parseFloat(t.priceChangePercent) || 0
          }
        }
      }
    } catch (e) {
      errors.push(`data-api.binance.vision failed: ${e instanceof Error ? e.message : e}`)
    }

    // 2. FALLBACK + ENRICHMENT: CoinGecko Pro for tokens NOT on Binance USDT
    // (mostly wrapped tokens, niche memes) and to add market_cap which
    // Binance doesn't provide.
    const cgKey = process.env.COINGECKO_API_KEY
    if (cgKey) {
      const missingOrNeedsMcap = TICKER_MAP.filter(t => !livePrices[t.symbol] || livePrices[t.symbol].market_cap == null)
      if (missingOrNeedsMcap.length > 0) {
        const ids = missingOrNeedsMcap.map(t => t.id).join(',')
        try {
          const cgRes = await fetch(
            `https://pro-api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
            {
              headers: { 'Accept': 'application/json', 'x-cg-pro-api-key': cgKey },
              signal: AbortSignal.timeout(15000),
            }
          )
          if (cgRes.ok) {
            const data = await cgRes.json()
            for (const t of missingOrNeedsMcap) {
              const pd = data[t.id]
              if (!pd?.usd) continue
              if (!livePrices[t.symbol]) {
                // CG is the primary source for this token
                livePrices[t.symbol] = {
                  price: pd.usd,
                  volume_24h: pd.usd_24h_vol || 0,
                  price_change_24h: pd.usd_24h_change || 0,
                  market_cap: pd.usd_market_cap || null,
                }
              } else if (pd.usd_market_cap) {
                // Binance gave us price/volume; use CG just for market_cap
                livePrices[t.symbol].market_cap = pd.usd_market_cap
              }
            }
          } else {
            errors.push(`CoinGecko HTTP ${cgRes.status}`)
          }
        } catch (cgErr) {
          errors.push(`CoinGecko enrichment failed: ${cgErr instanceof Error ? cgErr.message : cgErr}`)
        }
      }
    }

    // Stale-source guard: if NEW BTC matches the most recent snapshot to 4
    // decimal places AND that snapshot is < 30min old, source is poisoned.
    // Refuse to insert another stale row.
    const newBtcPrice = livePrices.BTC?.price
    if (newBtcPrice) {
      const { data: lastBtc } = await supabase
        .from('price_snapshots')
        .select('price_usd, timestamp')
        .eq('ticker', 'BTC')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastBtc?.price_usd && Math.abs(Number(lastBtc.price_usd) - newBtcPrice) < 0.0001) {
        const ageMin = (Date.now() - new Date(lastBtc.timestamp).getTime()) / 60000
        if (ageMin < 30) {
          errors.push(`BTC unchanged ($${lastBtc.price_usd}) in ${ageMin.toFixed(1)}min — source stale, aborting`)
          return NextResponse.json({
            success: false,
            stale: true,
            sample_btc: newBtcPrice,
            errors,
          }, { status: 503 })
        }
      }
    }

    // Insert all live prices
    for (const ticker of TICKER_MAP) {
      const lp = livePrices[ticker.symbol]
      if (!lp || !lp.price || lp.price <= 0) continue
      try {
        const { error: insertError } = await supabase
          .from('price_snapshots')
          .insert({
            ticker: ticker.symbol,
            timestamp: new Date().toISOString(),
            price_usd: lp.price,
            market_cap: lp.market_cap ?? null,
            volume_24h: lp.volume_24h ?? null,
            price_change_1h: null,
            price_change_24h: lp.price_change_24h ?? null,
            price_change_7d: null,
          })
        if (!insertError) totalInserted++
        else if (!insertError.message.includes('duplicate key')) {
          errors.push(`insert ${ticker.symbol}: ${insertError.message}`)
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

