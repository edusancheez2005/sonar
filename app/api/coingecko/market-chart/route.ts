/**
 * API Route: Get market chart data for a coin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMarketChart } from '@/lib/coingecko/client'
import { coinRegistry } from '@/lib/coingecko/coin-registry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const id = searchParams.get('id')
    const days = searchParams.get('days') || '7'
    const interval = searchParams.get('interval') || 'daily'

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

    // Fetch market chart data
    const data = await getMarketChart(
      coinId!,
      days === 'max' ? 'max' : parseInt(days),
      interval as 'daily' | 'hourly'
    )

    return NextResponse.json({
      success: true,
      coin_id: coinId,
      days,
      interval,
      data,
    })
  } catch (error) {
    console.error('Market chart API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market chart data' },
      { status: 500 }
    )
  }
}
