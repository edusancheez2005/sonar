/**
 * GET /api/frontier/pulse
 *
 * Powers the four hero tiles + the live SPL transfer feed on /frontier.
 * Read-only, gated to authenticated users (admin cookie OR Supabase
 * session). Cached briefly on Vercel's edge to absorb the 15s polling
 * cadence from the client.
 *
 * Response shape (single trip to keep the page snappy):
 *   {
 *     tiles: {
 *       trackedEntities, transfers24h, netFlowUsd24h, bridgeIns24h,
 *       sparkTransfers: number[24], sparkNetFlow: number[24]
 *     },
 *     transfers: Array<{
 *       id, time, entity, entityType, direction, token, amount,
 *       amountUsd, txHash, address, chain, source
 *     }>,
 *     status: { dataFresh: boolean, lastTransferAt: string|null, mode: 'live'|'ingesting' }
 *   }
 *
 * "ingesting" mode (no SOL rows yet) is an explicit, honest state — the
 * UI shows "Solana ingestion live, first transfers landing within the
 * hour" rather than fake skeletons.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { BRIDGE_ADDRESSES } from '@/app/frontier/bridges'
import { isAuthorized } from '@/app/api/frontier/_auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const TRANSFER_LIMIT = 50

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const now = Date.now()
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  // Run the four queries in parallel — none depend on each other.
  const [entitiesRes, transfersRes, recentRes, allWindowRes] = await Promise.all([
    supabaseAdmin
      .from('tracked_address_universe')
      .select('arkham_entity_name', { count: 'exact', head: false })
      .eq('chain', 'solana'),
    // Count + sum window (last 24h)
    supabaseAdmin
      .from('tracked_address_transfers')
      .select('amount_usd, direction, counterparty, timestamp', { count: 'exact' })
      .eq('chain', 'solana')
      .gte('timestamp', since24h)
      .limit(10000),
    // Live feed (last 50 SOL transfers)
    supabaseAdmin
      .from('tracked_address_transfers')
      .select('id, timestamp, address, direction, token_symbol, amount, amount_usd, tx_hash, source, arkham_entity_name, arkham_entity_type, arkham_label')
      .eq('chain', 'solana')
      .order('timestamp', { ascending: false })
      .limit(TRANSFER_LIMIT),
    // For sparkline buckets we only need timestamp + signed USD over 24h —
    // already covered by `transfersRes`. Reuse below.
    Promise.resolve(null),
  ])

  if (transfersRes.error) {
    return NextResponse.json({ error: transfersRes.error.message }, { status: 500 })
  }

  const distinctEntities = new Set(
    (entitiesRes.data || [])
      .map((r) => r.arkham_entity_name)
      .filter(Boolean),
  )
  const trackedEntities = distinctEntities.size

  const windowRows = transfersRes.data || []
  const transfers24h = windowRows.length

  let netFlowUsd24h = 0
  let bridgeIns24h = 0
  // 24 hourly buckets, oldest → newest
  const bucketCount = 24
  const sparkTransfers = new Array(bucketCount).fill(0)
  const sparkNetFlow = new Array(bucketCount).fill(0)
  const bridgeSet = new Set(BRIDGE_ADDRESSES)

  for (const r of windowRows) {
    const usd = Number(r.amount_usd) || 0
    const sign = r.direction === 'in' ? 1 : -1
    netFlowUsd24h += sign * usd
    if (r.direction === 'in' && r.counterparty && bridgeSet.has(r.counterparty)) {
      bridgeIns24h += 1
    }
    const ts = new Date(r.timestamp).getTime()
    const hoursAgo = Math.floor((now - ts) / (60 * 60 * 1000))
    if (hoursAgo >= 0 && hoursAgo < bucketCount) {
      const idx = bucketCount - 1 - hoursAgo // oldest at idx 0
      sparkTransfers[idx] += 1
      sparkNetFlow[idx] += sign * usd
    }
  }

  const recent = recentRes.data || []
  const lastTransferAt = recent[0]?.timestamp || null
  const mode = recent.length > 0 ? 'live' : 'ingesting'
  const dataFresh =
    lastTransferAt != null &&
    Date.now() - new Date(lastTransferAt).getTime() < 4 * 60 * 60 * 1000

  const transfers = recent.map((r) => ({
    id: r.id,
    time: r.timestamp,
    entity: r.arkham_entity_name,
    entityType: r.arkham_entity_type,
    label: r.arkham_label,
    direction: r.direction,
    token: r.token_symbol,
    amount: r.amount,
    amountUsd: r.amount_usd,
    txHash: r.tx_hash,
    address: r.address,
    chain: 'solana',
    source: r.source,
  }))

  return NextResponse.json(
    {
      tiles: {
        trackedEntities,
        transfers24h,
        netFlowUsd24h,
        bridgeIns24h,
        sparkTransfers,
        sparkNetFlow,
      },
      transfers,
      status: { dataFresh, lastTransferAt, mode },
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    },
  )
}
