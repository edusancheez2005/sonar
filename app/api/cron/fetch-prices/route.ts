/**
 * PHASE 1 - CRON JOB 4: Price Snapshots
 * Schedule: Every 15 minutes
 * Purpose: Fetch current prices from CoinGecko
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Top 50 crypto tickers with their CoinGecko IDs
const TICKER_MAP = [
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
  { symbol: 'NEAR', id: 'near' },
  { symbol: 'ALGO', id: 'algorand' },
  { symbol: 'VET', id: 'vechain' },
  { symbol: 'FIL', id: 'filecoin' },
  { symbol: 'APT', id: 'aptos' },
  { symbol: 'HBAR', id: 'hedera-hashgraph' },
  { symbol: 'ARB', id: 'arbitrum' },
  { symbol: 'OP', id: 'optimism' },
  { symbol: 'GRT', id: 'the-graph' },
  { symbol: 'SAND', id: 'the-sandbox' },
  { symbol: 'MANA', id: 'decentraland' },
  { symbol: 'AAVE', id: 'aave' },
  { symbol: 'STX', id: 'blockstack' },
  { symbol: 'INJ', id: 'injective-protocol' },
  { symbol: 'MKR', id: 'maker' },
  { symbol: 'SNX', id: 'havven' },
  { symbol: 'RUNE', id: 'thorchain' },
  { symbol: 'FTM', id: 'fantom' },
  { symbol: 'IMX', id: 'immutable-x' },
  { symbol: 'AXS', id: 'axie-infinity' },
  { symbol: 'GALA', id: 'gala' },
  { symbol: 'ENJ', id: 'enjincoin' },
  { symbol: 'CHZ', id: 'chiliz' },
  { symbol: 'LDO', id: 'lido-dao' },
  { symbol: 'CRV', id: 'curve-dao-token' },
  { symbol: 'COMP', id: 'compound-governance-token' },
  { symbol: 'YFI', id: 'yearn-finance' },
  { symbol: 'BAT', id: 'basic-attention-token' },
  { symbol: 'ZRX', id: '0x' },
  { symbol: 'SUSHI', id: 'sushi' }
]

const BATCH_SIZE = 50 // CoinGecko allows up to 250 IDs per request, we'll use 50

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const apiKey = process.env.COINGECKO_API_KEY
    if (!apiKey) {
      throw new Error('COINGECKO_API_KEY not configured')
    }

    let totalInserted = 0
    const errors: string[] = []

    // Process in batches to respect rate limits
    for (let i = 0; i < TICKER_MAP.length; i += BATCH_SIZE) {
      const batch = TICKER_MAP.slice(i, i + BATCH_SIZE)
      const coinIds = batch.map(t => t.id).join(',')

      try {
        // Fetch prices from CoinGecko Pro API
        const url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'x-cg-pro-api-key': apiKey
          }
        })

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Insert price data for each coin
        for (const ticker of batch) {
          const priceData: CoinGeckoPrice = data[ticker.id]

          if (!priceData || !priceData.usd) {
            console.warn(`No price data for ${ticker.symbol} (${ticker.id})`)
            continue
          }

          try {
            const { error: insertError } = await supabase
              .from('price_snapshots')
              .insert({
                ticker: ticker.symbol,
                timestamp: new Date().toISOString(),
                price_usd: priceData.usd,
                market_cap: priceData.usd_market_cap || null,
                volume_24h: priceData.usd_24h_vol || null,
                price_change_1h: null, // Not available in simple/price endpoint
                price_change_24h: priceData.usd_24h_change || null,
                price_change_7d: null // Not available in simple/price endpoint
              })

            if (insertError) {
              // Ignore duplicate key errors
              if (!insertError.message.includes('duplicate key')) {
                errors.push(`Failed to insert ${ticker.symbol}: ${insertError.message}`)
              }
            } else {
              totalInserted++
            }

          } catch (insertErr) {
            errors.push(`Insert error for ${ticker.symbol}: ${insertErr}`)
          }
        }

        // Small delay between batches to respect rate limits (250 req/min = ~240ms per request)
        await delay(500)

      } catch (batchError) {
        const errorMsg = `Batch fetch error: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
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

