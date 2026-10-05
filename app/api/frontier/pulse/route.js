/**
 * GET /api/frontier/pulse
 *
 * Powers the four hero tiles + the live SPL transfer feed on /frontier.
 * Read-only, gated to authenticated users.
 *
 * Pipeline:
 *   1. Pull a 24h window of Solana transfers + the latest 250 raw rows.
 *   2. Resolve raw mint addresses to symbols via SPL_TOKENS map.
 *   3. Enrich USD using the latest price_snapshots row per ticker
 *      (SOL, USDC, JUP, BONK, …). Stables short-circuit to $1.
 *   4. Filter dust ( < $250 ) so the feed shows real flow, not exchange
 *      rebalancing noise.
 *   5. Compute tiles + 24h sparklines from the enriched window.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { BRIDGE_ADDRESSES } from '@/app/frontier/bridges'
import { resolveToken, ENRICHABLE_TICKERS } from '@/app/frontier/splTokens'
import { isAuthorized } from '@/app/api/frontier/_auth'
import { fetchSolanaTransfers, getSolanaUniverse } from '@/lib/frontier/solanaTransfers'
import { fetchSolanaWhaleRows, fetchSolanaWhaleNewestAt, whaleRowToTransfer } from '@/lib/frontier/whaleFeed'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const FEED_LIMIT = 50
const RAW_LIMIT = 250          // pull more than we show so we can dust-filter
const DUST_USD_FLOOR = 250     // minimum USD to make it onto the feed
const TINY_USD_FLOOR = 25      // stricter floor for stable-only legs (USDC↔USDT noise)

async function loadPriceMap() {
  const tickers = Array.from(ENRICHABLE_TICKERS)
  const { data, error } = await supabaseAdmin
    .from('price_snapshots')
    .select('ticker, price_usd, timestamp')
    .in('ticker', tickers)
    .order('timestamp', { ascending: false })
    .limit(500)
  if (error) return new Map()
  const out = new Map()
  for (const row of data || []) {
    if (!out.has(row.ticker)) out.set(row.ticker, Number(row.price_usd) || 0)
  }
  return out
}

function enrichRow(row, priceMap) {
  const tokenInfo = resolveToken(row.token_symbol)
  let usd = Number(row.amount_usd)
  if (!Number.isFinite(usd) || usd <= 0) {
    let price = tokenInfo.priceUsd
    if (price == null) price = priceMap.get(tokenInfo.symbol) || null
    const amt = Number(row.amount)
    if (Number.isFinite(amt) && price && Number.isFinite(price)) {
      usd = amt * price
    } else {
      usd = 0
    }
  }
  return {
    id: row.id,
    time: row.timestamp,
    entity: row.arkham_entity_name,
    entityType: row.arkham_entity_type,
    label: row.arkham_label,
    direction: row.direction,
    token: tokenInfo.symbol,
    tokenKind: tokenInfo.kind,
    amount: Number(row.amount) || 0,
    amountUsd: usd,
    counterparty: row.counterparty,
    txHash: row.tx_hash,
    address: row.address,
    chain: 'solana',
    source: row.source,
  }
}

function passesDustFilter(t) {
  if (!t.amountUsd || t.amountUsd <= 0) return false
  if (t.tokenKind === 'stable' && t.amountUsd < TINY_USD_FLOOR) return false
  return t.amountUsd >= DUST_USD_FLOOR
}

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const now = Date.now()
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  // 2026-10-01: per-address reads (see lib/frontier/solanaTransfers.js); the
  // old chain+timestamp filter scanned the whole table and timed out → 500.
  let universe = []
  let windowRows = []
  let recentRows = []
  const readErrors = []
  let priceMap = new Map()
  let whaleReadFailed = false
  try {
    universe = await getSolanaUniverse()
  } catch (e) {
    readErrors.push(String(e?.message || e))
  }
  const addresses = universe.map((r) => r.address).filter(Boolean)
  const SEL = 'id, timestamp, address, direction, token_symbol, amount, amount_usd, counterparty, tx_hash, source, arkham_entity_name, arkham_entity_type, arkham_label'
  const [winRes, recRes, prices, whaleRows] = await Promise.all([
    fetchSolanaTransfers({ select: SEL, sinceIso: since24h, perAddress: 300, limit: 5000, addresses }).catch((e) => ({ rows: [], errors: [String(e?.message || e)] })),
    fetchSolanaTransfers({ select: SEL, sinceIso: new Date(now - 7 * 24 * 3_600_000).toISOString(), perAddress: 20, limit: RAW_LIMIT, addresses }).catch((e) => ({ rows: [], errors: [String(e?.message || e)] })),
    loadPriceMap(),
    // Live whale feed (Railway monitor → solana_transactions): the tracked
    // wallets are mostly dormant, this is what keeps the page live.
    fetchSolanaWhaleRows({ sinceIso: since24h, limit: 3000 }).catch((e) => { whaleReadFailed = true; readErrors.push(String(e?.message || e)); return [] }),
  ])
  windowRows = winRes.rows
  recentRows = recRes.rows
  readErrors.push(...(winRes.errors || []), ...(recRes.errors || []))
  priceMap = prices
  const entitiesRes = { data: universe }
  const windowRes = { data: windowRows }
  const recentRes = { data: recentRows }
  const whaleTransfers = whaleRows.map(whaleRowToTransfer)
  if (readErrors.length) console.warn('[frontier/pulse] partial read errors', readErrors.slice(0, 3))

  const distinctEntities = new Set(
    (entitiesRes.data || []).map((r) => r.arkham_entity_name).filter(Boolean),
  )
  const trackedEntities = distinctEntities.size

  const enrichedWindow = [...(windowRes.data || []).map((r) => enrichRow(r, priceMap)), ...whaleTransfers]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
  const bridgeSet = new Set(BRIDGE_ADDRESSES)
  const bucketCount = 24
  const sparkTransfers = new Array(bucketCount).fill(0)
  const sparkNetFlow = new Array(bucketCount).fill(0)
  let netFlowUsd24h = 0
  let bridgeIns24h = 0
  let whaleMoves24h = 0      // count of single transfers >= WHALE_THRESHOLD_USD
  const WHALE_THRESHOLD_USD = 50_000
  let transfers24h = 0
  for (const t of enrichedWindow) {
    transfers24h += 1
    const sign = t.direction === 'in' ? 1 : -1
    netFlowUsd24h += sign * (t.amountUsd || 0)
    if (t.direction === 'in' && t.counterparty && bridgeSet.has(t.counterparty)) {
      bridgeIns24h += 1
    }
    if ((t.amountUsd || 0) >= WHALE_THRESHOLD_USD) whaleMoves24h += 1
    const hoursAgo = Math.floor((now - new Date(t.time).getTime()) / 3_600_000)
    if (hoursAgo >= 0 && hoursAgo < bucketCount) {
      const idx = bucketCount - 1 - hoursAgo
      sparkTransfers[idx] += 1
      sparkNetFlow[idx] += sign * (t.amountUsd || 0)
    }
  }

  const enrichedRecent = [...(recentRes.data || []).map((r) => enrichRow(r, priceMap)), ...whaleTransfers]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, RAW_LIMIT)
  const filtered = enrichedRecent.filter(passesDustFilter).slice(0, FEED_LIMIT)
  // If the dust filter starved the table (e.g. early ingest, no prices yet)
  // fall back to ranking by raw amount so the page is never empty.
  const transfers = filtered.length > 0
    ? filtered
    : [...enrichedRecent]
        .filter((t) => Number(t.amount) > 0.5)
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, FEED_LIMIT)

  // Top Movers: aggregate 24h enriched window by entity, signed by direction.
  // Stable noise (USDC↔USDT internal moves) is dust-filtered before sum so
  // a thousand sub-$25 USDC legs don't drown out one real $5M outflow.
  const moverAgg = new Map()
  for (const t of enrichedWindow) {
    if (!t.entity) continue
    if (!t.amountUsd || t.amountUsd <= 0) continue
    if (t.tokenKind === 'stable' && t.amountUsd < TINY_USD_FLOOR) continue
    const key = t.entity
    const sign = t.direction === 'in' ? 1 : -1
    const cur = moverAgg.get(key) || { entity: key, entityType: t.entityType, netUsd: 0, inUsd: 0, outUsd: 0, count: 0 }
    cur.netUsd += sign * t.amountUsd
    if (sign > 0) cur.inUsd += t.amountUsd
    else cur.outUsd += t.amountUsd
    cur.count += 1
    moverAgg.set(key, cur)
  }
  const topMovers = Array.from(moverAgg.values())
    .filter((m) => Math.abs(m.netUsd) >= 1000)
    .sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))
    .slice(0, 8)

  // Token rotation: net entity flow per token, bucketed 1h / 4h / 24h.
  // Counts a transfer once. Sign convention: + = into tracked entities
  // (mostly CEX hot wallets), − = out to self-custody / DeFi.
  const ROT_MIN_USD = 1_000
  const cut1h = now - 3_600_000
  const cut4h = now - 4 * 3_600_000
  const rotAgg = new Map()
  for (const t of enrichedWindow) {
    if (!t.token || !t.amountUsd || t.amountUsd <= 0) continue
    if (t.tokenKind === 'stable' && t.amountUsd < TINY_USD_FLOOR) continue
    if (t.amountUsd < 50) continue   // sub-$50 noise on non-stables
    const ts = new Date(t.time).getTime()
    const sign = t.direction === 'in' ? 1 : -1
    const signed = sign * t.amountUsd
    const cur = rotAgg.get(t.token) || {
      token: t.token, kind: t.tokenKind,
      in1h: 0, out1h: 0, net1h: 0,
      in4h: 0, out4h: 0, net4h: 0,
      in24h: 0, out24h: 0, net24h: 0,
      count24h: 0,
    }
    if (sign > 0) cur.in24h += t.amountUsd; else cur.out24h += t.amountUsd
    cur.net24h += signed
    cur.count24h += 1
    if (ts >= cut4h) {
      if (sign > 0) cur.in4h += t.amountUsd; else cur.out4h += t.amountUsd
      cur.net4h += signed
    }
    if (ts >= cut1h) {
      if (sign > 0) cur.in1h += t.amountUsd; else cur.out1h += t.amountUsd
      cur.net1h += signed
    }
    rotAgg.set(t.token, cur)
  }
  const rotation = Array.from(rotAgg.values())
    .filter((r) => Math.abs(r.net24h) >= ROT_MIN_USD || Math.abs(r.net4h) >= ROT_MIN_USD)
    .sort((a, b) => Math.abs(b.net24h) - Math.abs(a.net24h))
    .slice(0, 12)

  const lastTransferAt = enrichedRecent[0]?.time || null
  // When did the whale feed last deliver? The 24h read answers it when it has
  // rows; otherwise one newest-row lookup. Stalled = nothing for 3h, the same
  // threshold as the health-email canary. An unreadable feed is not called
  // stalled (readErrors already says what failed).
  const FEED_STALL_MS = 3 * 3_600_000
  let feedLastAt = whaleRows[0]?.timestamp || null
  let feedKnown = !whaleReadFailed
  if (!feedLastAt && feedKnown) {
    try {
      feedLastAt = await fetchSolanaWhaleNewestAt()
    } catch (e) {
      feedKnown = false
      readErrors.push(String(e?.message || e))
    }
  }
  const feedStalled = feedKnown && (!feedLastAt || now - new Date(feedLastAt).getTime() > FEED_STALL_MS)
  const mode = feedStalled ? 'stalled' : enrichedRecent.length > 0 ? 'live' : 'ingesting'
  const dataFresh =
    lastTransferAt != null &&
    Date.now() - new Date(lastTransferAt).getTime() < 4 * 3_600_000

  return NextResponse.json(
    {
      tiles: {
        trackedEntities,
        transfers24h,
        netFlowUsd24h,
        bridgeIns24h,
        whaleMoves24h,
        whaleThresholdUsd: WHALE_THRESHOLD_USD,
        sparkTransfers,
        sparkNetFlow,
      },
      transfers,
      topMovers,
      rotation,
      status: {
        dataFresh, lastTransferAt, feedLastAt, mode, dustFloorUsd: DUST_USD_FLOOR,
        sources: { tracked_24h: (windowRes.data || []).length, whale_feed_24h: whaleTransfers.length },
        readErrors: readErrors.length ? readErrors.slice(0, 2) : undefined,
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } },
  )
}
