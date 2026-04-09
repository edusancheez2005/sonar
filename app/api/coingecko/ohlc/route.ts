/**
 * API Route: Get OHLC (candlestick) data for a coin
 * Data source: Binance klines (replaced CoinGecko)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getKlines } from '@/lib/binance/client'
import { symbolToPair, daysToOhlcInterval } from '@/lib/binance/symbol-map'

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
    const days = parseInt(searchParams.get('days') || '7')

    if (!symbol && !id) {
      return NextResponse.json(
        { error: 'Either symbol or id parameter required' },
        { status: 400 }
      )
    }

    // Resolve to Binance pair
    const tokenSymbol = symbol?.toUpperCase() || (id ? ID_TO_SYMBOL[id] : null)
    if (!tokenSymbol) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const pair = symbolToPair(tokenSymbol)
    if (!pair) {
      return NextResponse.json({ error: 'Token not available on Binance' }, { status: 404 })
    }

    const interval = daysToOhlcInterval(days)
    const endTime = Date.now()
    const startTime = endTime - days * 24 * 60 * 60 * 1000

    const klines = await getKlines(pair, interval, 1000, startTime, endTime)

    // Transform to same format the frontend expects
    const formattedData = klines.map(k => ({
      timestamp: k.openTime,
      date: new Date(k.openTime).toISOString(),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }))

    return NextResponse.json({
      success: true,
      coin_id: id || tokenSymbol.toLowerCase(),
      days: String(days),
      data: formattedData,
    })
  } catch (error) {
    console.error('OHLC API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OHLC data' },
      { status: 500 }
    )
  }
}
