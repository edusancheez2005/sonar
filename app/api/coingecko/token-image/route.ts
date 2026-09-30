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

// Logos almost never change; rows are seeded from a laptop by
// scripts/logos/seed_token_logos.py (free CoinGecko tier 429s from Vercel's
// egress IPs). Eduardo (2026-09-30): "the logos won't change much… run this
// again in 6 months". Stored hits therefore NEVER expire — a stale logo beats
// a letter — and the weekly cron only refreshes when a key is configured.
const MISS_TTL_MS = 24 * 3600 * 1000
const HIT_HEADERS = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }
const MISS_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
// A lookup that failed because CoinGecko rate-limited us (or errored) says
// nothing about the token — never cache that, at the edge or in app_cache.
const TRANSIENT_HEADERS = { 'Cache-Control': 'no-store' }
function isTransient(reason: string): boolean {
  return /\(429\)|\(5\d\d\)|fetch failed|timeout|ECONN|network/i.test(reason)
}

type Meta = { id: string; symbol: string; name: string; image_url: string | null; miss?: boolean }

async function readCache(key: string): Promise<Meta | null> {
  try {
    const { data } = await supabaseAdmin
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle()
    if (!data?.value) return null
    const age = Date.now() - Date.parse(data.updated_at || 0)
    if (!Number.isFinite(age)) return null
    const v = data.value as Meta
    if (v.miss) return age <= MISS_TTL_MS ? v : null
    return v
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

let lastReason = ''
async function viaSearch(symbol: string): Promise<Meta | null> {
  try {
    // One attempt: from Vercel the free tier 429s deterministically, and three
    // backoff retries turned every miss into a 7s wait.
    const res = await search(symbol, { retries: 1 })
    const up = symbol.toUpperCase()
    const coin = res.coins.find((c) => c.symbol?.toUpperCase() === up) || null
    if (!coin) return null
    return { id: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, image_url: coin.large || coin.thumb || null }
  } catch (e) {
    lastReason = String((e as Error)?.message || e).slice(0, 160)
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
  if (cached?.miss) return NextResponse.json({ error: 'Token not found', cached_miss: true }, { status: 404, headers: MISS_HEADERS })
  if (cached) return NextResponse.json(cached, { headers: HIT_HEADERS })
  lastReason = ''

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
    lastReason = String((error as Error)?.message || error).slice(0, 160)
    console.error('Token image lookup failed:', lastReason)
  }

  if (!metadata) {
    if (lastReason && isTransient(lastReason)) {
      // Rate-limited / upstream down: answer 404 for this request only.
      return NextResponse.json({ error: 'Token not found', transient: true, reason: lastReason }, { status: 404, headers: TRANSIENT_HEADERS })
    }
    // Genuine miss: remember it for a day so a dashboard full of unknown
    // tickers does not re-hit CoinGecko on every page view.
    await writeCache(cacheKey, { id: '', symbol: symbol.toUpperCase(), name: '', image_url: null, miss: true })
    return NextResponse.json({ error: 'Token not found', reason: lastReason || undefined }, { status: 404, headers: MISS_HEADERS })
  }

  if (metadata.image_url) await writeCache(cacheKey, metadata)
  return NextResponse.json(metadata, { headers: HIT_HEADERS })
}
