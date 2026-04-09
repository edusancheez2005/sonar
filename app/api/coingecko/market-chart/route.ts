/**
 * API Route: Get market chart data for a coin
 * Data source: Binance klines (replaced CoinGecko)
 * Returns same shape: { prices: [[ts, price], ...], total_volumes: [[ts, vol], ...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getKlines } from '@/lib/binance/client'
import { symbolToPair, daysToInterval } from '@/lib/binance/symbol-map'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Map CoinGecko IDs → symbols for backward compat
const ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', polkadot: 'DOT',
  'avalanche-2': 'AVAX', chainlink: 'LINK', uniswap: 'UNI', cosmos: 'ATOM',
  litecoin: 'LTC', filecoin: 'FIL', 'near-protocol': 'NEAR', aptos: 'APT',
  arbitrum: 'ARB', optimism: 'OP', aave: 'AAVE', maker: 'MKR',
  'curve-dao-token': 'CRV', havven: 'SNX', compound: 'COMP', sushi: 'SUSHI',
  algorand: 'ALGO', fantom: 'FTM', 'the-sandbox': 'SAND', decentraland: 'MANA',
  'axie-infinity': 'AXS', 'the-graph': 'GRT', shiba: 'SHIB', pepe: 'PEPE',
  worldcoin: 'WLD', sui: 'SUI', sei: 'SEI', celestia: 'TIA',
  injective: 'INJ', stacks: 'STX', 'immutable-x': 'IMX', render: 'RENDER',
  'fetch-ai': 'FET', jupiter: 'JUP', dogwifhat: 'WIF', bonk: 'BONK',
  floki: 'FLOKI', jasmycoin: 'JASMY', ethena: 'ENA', pendle: 'PENDLE',
  tao: 'TAO', ondo: 'ONDO', tron: 'TRX', toncoin: 'TON',
  'ethereum-classic': 'ETC', stellar: 'XLM', hedera: 'HBAR', vechain: 'VET',
  'internet-computer': 'ICP', theta: 'THETA', thorchain: 'RUNE', ens: 'ENS',
  'matic-network': 'MATIC', 'polygon-ecosystem-token': 'POL',
  'wrapped-bitcoin': 'BTC', weth: 'ETH',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const id = searchParams.get('id')
    const daysParam = searchParams.get('days') || '7'
    const days = daysParam === 'max' ? 365 : parseInt(daysParam)

    if (!symbol && !id) {
      return NextResponse.json(
        { error: 'Either symbol or id parameter required' },
        { status: 400 }
      )
    }

    const tokenSymbol = symbol?.toUpperCase() || (id ? ID_TO_SYMBOL[id] : null)
    if (!tokenSymbol) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const pair = symbolToPair(tokenSymbol)
    if (!pair) {
      return NextResponse.json({ error: 'Token not available on Binance' }, { status: 404 })
    }

    const interval = daysToInterval(days)
    const endTime = Date.now()
    const startTime = endTime - days * 24 * 60 * 60 * 1000

    const klines = await getKlines(pair, interval, 1000, startTime, endTime)

    // Transform to CoinGecko-compatible format: [[timestamp, value], ...]
    const prices: [number, number][] = klines.map(k => [k.openTime, k.close])
    const total_volumes: [number, number][] = klines.map(k => [k.openTime, k.quoteVolume])
    const market_caps: [number, number][] = [] // Binance doesn't provide market cap

    return NextResponse.json({
      success: true,
      coin_id: id || tokenSymbol.toLowerCase(),
      days: daysParam,
      interval: days <= 1 ? 'hourly' : 'daily',
      data: { prices, market_caps, total_volumes },
    })
  } catch (error) {
    console.error('Market chart API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market chart data' },
      { status: 500 }
    )
  }
}
