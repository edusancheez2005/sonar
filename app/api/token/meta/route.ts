/**
 * API Route: LunarCrush Coin Meta — project links, social profiles, description
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || ''
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4'

// Cache: 1 hour (meta data changes infrequently)
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toLowerCase()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const cached = cache.get(symbol)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const res = await fetch(
      `${LUNARCRUSH_BASE_URL}/public/coins/${symbol}/meta/v1`,
      {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ available: false, symbol: symbol.toUpperCase() })
    }

    const json = await res.json()
    const meta = json.data || json

    const response = {
      available: true,
      symbol: symbol.toUpperCase(),
      name: meta.name || null,
      description: meta.description || null,
      website: meta.urls?.website?.[0] || meta.website || null,
      whitepaper: meta.urls?.whitepaper?.[0] || meta.whitepaper || null,
      twitter: meta.urls?.twitter?.[0] || meta.twitter || null,
      reddit: meta.urls?.reddit?.[0] || meta.reddit || null,
      telegram: meta.urls?.telegram?.[0] || meta.telegram || null,
      discord: meta.urls?.discord?.[0] || meta.discord || null,
      github: meta.urls?.github?.[0] || meta.github || null,
      explorer: meta.urls?.explorer?.[0] || meta.explorer || null,
      categories: meta.categories || [],
      blockchains: meta.blockchains || [],
      logo: meta.logo || null,
    }

    cache.set(symbol, { data: response, ts: Date.now() })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Coin meta API error:', error)
    return NextResponse.json(
      { available: false, error: 'Failed to fetch coin meta' },
      { status: 500 }
    )
  }
}
