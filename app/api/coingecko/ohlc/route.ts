/**
 * API Route: Get OHLC (candlestick) data for a coin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOHLC } from '@/lib/coingecko/client'
import { coinRegistry } from '@/lib/coingecko/coin-registry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const id = searchParams.get('id')
    const days = searchParams.get('days') || '7'

    if (!symbol && !id) {
      return NextResponse.json(
        { error: 'Either symbol or id parameter required' },
        { status: 400 }
      )
    }

    let coinId = id

    // Resolve symbol to ID if needed
    if (!coinId && symbol) {
      const metadata = await coinRegistry.resolve(symbol)
      if (!metadata) {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        )
      }
      coinId = metadata.id
    }

    // Fetch OHLC data
    const data = await getOHLC(coinId!, parseInt(days))

    // Transform to more friendly format
    const formattedData = data.map(([timestamp, open, high, low, close]) => ({
      timestamp,
      date: new Date(timestamp).toISOString(),
      open,
      high,
      low,
      close,
    }))

    return NextResponse.json({
      success: true,
      coin_id: coinId,
      days,
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
