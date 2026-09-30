/**
 * API Route: Get token image URL
 * Returns the CoinGecko image URL for a given token.
 *
 * 2026-09-30: rebuilt after months of silent 500s (see lib/coingecko/client.ts).
 * Order: app_cache (30-day) → CoinGecko /search exact-symbol match (one small
 * call) → full coin registry (3.9 MB list; last resort). Responses carry
 * s-maxage so Vercel's CDN serves repeat symbols without invoking this at all.
 * Never returns 500: on any failure the icon falls back to a letter quickly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { coinRegistry } from '@/lib/coingecko/coin-registry'
import { search } from '@/lib/coingecko/client'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_TTL_MS = 30 * 24 * 3600 * 1000
const HIT_HEADERS = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }
const MISS_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }

type Meta = { id: string; symbol: string; name: string; image_url: string | null }

async function readCache(key: string): Promise<Meta | null> {
  try {
    const { data } = await supabaseAdmin
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle()
    if (!data?.value) return null
    const age = Date.now() - Date.parse(data.updated_at || 0)
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null
    return data.value as Meta
  } catch {
    return null
  }
}

async function writeCache(key: string, value: Meta): Promise<void> {
  try {
    await supabaseAdmin
      .from('app_cache')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch { /* cache is best-effort */ }
}

async function viaSearch(symbol: string): Promise<Meta | null> {
  try {
    const res = await search(symbol)
    const up = symbol.toUpperCase()
    const coin = res.coins.find((c) => c.symbol?.toUpperCase() === up) || null
    if (!coin) return null
    return { id: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, image_url: coin.large || coin.thumb || null }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || '').trim().slice(0, 16)
  const id = (searchParams.get('id') || '').trim().slice(0, 64)

  if (!symbol && !id) {
    return NextResponse.json({ error: 'Either symbol or id parameter required' }, { status: 400 })
  }

  const cacheKey = id ? `cg_logo_id:${id.toLowerCase()}` : `cg_logo:${symbol.toUpperCase()}`
  const cached = await readCache(cacheKey)
  if (cached) return NextResponse.json(cached, { headers: HIT_HEADERS })

  let metadata: Meta | null = null
  try {
    if (id) {
      const m = await coinRegistry.getById(id)
      if (m) metadata = { id: m.id, symbol: m.symbol, name: m.name, image_url: m.image_url }
    } else {
      metadata = await viaSearch(symbol)
      if (!metadata) {
        const m = await coinRegistry.resolve(symbol)
        if (m) metadata = { id: m.id, symbol: m.symbol, name: m.name, image_url: m.image_url }
      }
    }
  } catch (error) {
    console.error('Token image lookup failed:', (error as Error)?.message || error)
  }

  if (!metadata) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404, headers: MISS_HEADERS })
  }

  if (metadata.image_url) await writeCache(cacheKey, metadata)
  return NextResponse.json(metadata, { headers: HIT_HEADERS })
}
