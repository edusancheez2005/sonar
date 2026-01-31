/**
 * API Route: Get token image URL
 * Returns the CoinGecko image URL for a given token
 */

import { NextRequest, NextResponse } from 'next/server'
import { coinRegistry } from '@/lib/coingecko/coin-registry'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const id = searchParams.get('id')

    if (!symbol && !id) {
      return NextResponse.json(
        { error: 'Either symbol or id parameter required' },
        { status: 400 }
      )
    }

    let metadata

    if (id) {
      metadata = await coinRegistry.getById(id)
    } else if (symbol) {
      metadata = await coinRegistry.resolve(symbol)
    }

    if (!metadata) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: metadata.id,
      symbol: metadata.symbol,
      name: metadata.name,
      image_url: metadata.image_url,
    })
  } catch (error) {
    console.error('Token image API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
