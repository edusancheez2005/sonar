import { NextResponse } from 'next/server'

// Probability history for one Polymarket market (the YES / first outcome),
// proxied so the client never talks to Polymarket directly and so we can
// cache aggressively: gamma-api resolves condition_id -> clob token id,
// then the CLOB API returns ~1 week of price points. Both are public,
// unauthenticated Polymarket endpoints.

const TTL_MS = 10 * 60 * 1000
const MAX_CACHE = 2000
const cache = new Map() // cid -> { at, data }

function cacheGet(cid) {
  const hit = cache.get(cid)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data
  return null
}

function cacheSet(cid, data) {
  if (cache.size >= MAX_CACHE) {
    // drop oldest entry
    const first = cache.keys().next().value
    cache.delete(first)
  }
  cache.set(cid, { at: Date.now(), data })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const cid = (searchParams.get('cid') || '').trim()
  if (!/^0x[a-fA-F0-9]{40,80}$/.test(cid)) {
    return NextResponse.json({ error: 'Invalid condition id' }, { status: 400 })
  }

  const cached = cacheGet(cid)
  if (cached) {
    return NextResponse.json(
      { data: cached, cached: true },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } }
    )
  }

  try {
    const gRes = await fetch(
      `https://gamma-api.polymarket.com/markets?condition_ids=${encodeURIComponent(cid)}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } }
    )
    if (!gRes.ok) throw new Error('gamma failed')
    const gJson = await gRes.json()
    const tokenRaw = Array.isArray(gJson) && gJson[0] ? gJson[0].clobTokenIds : null
    const tokens = typeof tokenRaw === 'string' ? JSON.parse(tokenRaw) : tokenRaw
    const token = Array.isArray(tokens) ? tokens[0] : null
    if (!token) throw new Error('no token')

    const hRes = await fetch(
      `https://clob.polymarket.com/prices-history?market=${token}&interval=1w&fidelity=120`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } }
    )
    if (!hRes.ok) throw new Error('clob failed')
    const hJson = await hRes.json()
    const points = Array.isArray(hJson.history)
      ? hJson.history
          .map((x) => ({ t: Number(x.t) * 1000, p: Number(x.p) }))
          .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.p))
      : []

    cacheSet(cid, points)
    return NextResponse.json(
      { data: points },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } }
    )
  } catch {
    // Soft-fail: cards render without a sparkline rather than erroring.
    return NextResponse.json(
      { data: [] },
      { status: 200, headers: { 'Cache-Control': 's-maxage=120' } }
    )
  }
}
