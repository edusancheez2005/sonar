import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

/**
 * Native-chain whale sync — Bitcoin, scanned directly from blocks via
 * blockchain.info (keyless, free).
 *
 * HISTORY: this route used the Whale Alert free API until it was
 * discontinued — /v1/transactions returns 404 since ~2026-09-09, which froze
 * this table for three weeks (again; see the 2026-03-25 incident below).
 * Replaced 2026-09-30 with a direct block scan: 1 blocks-list call + 1
 * rawblock call per new block (~7 calls/hour at the 10-min cron cadence).
 *
 * COVERAGE NOTE: this restores BTC only (which was ~all of the table's
 * recent rows). XRP/DOGE native transfers stay dark until we either pay for
 * Whale Alert or add per-chain sources — flagged in the 2026-09-30 report.
 *
 * Transfer semantics: for each tx we sum outputs that do NOT return to an
 * input address (change removal). Pure self-consolidations are skipped.
 * USD value uses the live Binance BTCUSDT price at scan time.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

const MIN_VALUE_USD = 500000
const LOOKBACK_MS = 75 * 60 * 1000     // 75-min window; hash dedupe absorbs the overlap
const MAX_BLOCKS_PER_RUN = 8

async function fetchBtcPriceUsd() {
  const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
  if (!r.ok) throw new Error(`Binance price fetch failed: ${r.status}`)
  const d = await r.json()
  const p = parseFloat(d.price)
  if (!Number.isFinite(p) || p <= 0) throw new Error('Binance returned no usable BTC price')
  return p
}

/** blockchain.info /blocks/{ms} returns one UTC day's blocks; fetch two days
 *  when the lookback window crosses midnight so early-UTC runs miss nothing. */
async function fetchRecentBlockHeaders() {
  const now = Date.now()
  const days = [now]
  if (new Date(now - LOOKBACK_MS).getUTCDate() !== new Date(now).getUTCDate()) {
    days.push(now - 24 * 60 * 60 * 1000)
  }
  const headers = []
  for (const day of days) {
    const r = await fetch(`https://blockchain.info/blocks/${day}?format=json`)
    if (!r.ok) throw new Error(`blockchain.info blocks list failed: ${r.status}`)
    const d = await r.json()
    headers.push(...(Array.isArray(d) ? d : d.blocks || []))
  }
  const cutoffSec = (now - LOOKBACK_MS) / 1000
  return headers
    .filter((b) => b && b.hash && b.time >= cutoffSec)
    .sort((a, b) => b.time - a.time)
    .slice(0, MAX_BLOCKS_PER_RUN)
}

/**
 * Scan recent Bitcoin blocks for large transfers; emit Whale Alert-shaped
 * objects so the save/enrichment path below is unchanged.
 */
async function fetchWhaleAlerts() {
  const price = await fetchBtcPriceUsd()
  const blocks = await fetchRecentBlockHeaders()
  console.log(`📡 BTC whale scan: ${blocks.length} block(s) in window, $${(MIN_VALUE_USD / 1000).toFixed(0)}k+ min, BTC=$${price.toFixed(0)}`)

  const out = []
  for (const b of blocks) {
    const r = await fetch(`https://blockchain.info/rawblock/${b.hash}`)
    if (!r.ok) {
      console.error(`rawblock ${b.height} failed: ${r.status}`)
      continue
    }
    const block = await r.json()
    for (const tx of block.tx || []) {
      const inputs = tx.inputs || []
      if (inputs.length === 0 || !inputs[0].prev_out) continue // coinbase
      const inAddrs = new Set(inputs.map((i) => i.prev_out?.addr).filter(Boolean))

      let movedSats = 0
      const destTotals = new Map()
      for (const o of tx.out || []) {
        if (!o.addr || inAddrs.has(o.addr)) continue // change back to sender
        movedSats += o.value || 0
        destTotals.set(o.addr, (destTotals.get(o.addr) || 0) + (o.value || 0))
      }
      const btc = movedSats / 1e8
      const usd = btc * price
      if (usd < MIN_VALUE_USD) continue

      const from = [...inputs].sort((a, c) => (c.prev_out?.value || 0) - (a.prev_out?.value || 0))[0]?.prev_out?.addr || null
      const to = [...destTotals.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] || null

      out.push({
        hash: tx.hash,
        blockchain: 'bitcoin',
        symbol: 'btc',
        amount: btc,
        amount_usd: Math.round(usd),
        from: { address: from, owner: null, owner_type: null },
        to: { address: to, owner: null, owner_type: null },
        transaction_type: 'transfer',
        transaction_count: 1,
        timestamp: tx.time || b.time,
        block_height: b.height,
        source: 'blockchain.info',
        btc_price_used: price,
      })
    }
  }

  console.log(`✅ BTC scan found ${out.length} transfers ≥ $${MIN_VALUE_USD / 1000}k`)
  return out
}

/**
 * Look up entity labels for a batch of (chain, address) pairs against
 * tracked_address_universe (the Arkham-harvested address book). Returns a
 * Map keyed by `${chain}:${address.toLowerCase()}` for O(1) join.
 *
 * Whale Alert uses chain slugs like "ethereum", "bitcoin", "tron",
 * "ripple", "binance smart chain". We accept whatever Whale Alert sends;
 * tracked_address_universe stores Arkham's slugs (ethereum, bitcoin,
 * tron, bsc, ...). For the mismatched ones (ripple/xrp, binance smart
 * chain/bsc) we map below.
 */
const CHAIN_ALIAS = {
  'ripple': 'ripple',
  'xrp': 'ripple',
  'binance smart chain': 'bsc',
  'binance-smart-chain': 'bsc',
  'arbitrum': 'arbitrum_one',
}
function normalizeChain(c) {
  if (!c) return c
  const k = String(c).toLowerCase().trim()
  return CHAIN_ALIAS[k] || k
}

async function fetchUniverseLabels(transactions) {
  const pairs = new Map() // key -> { chain, address }
  for (const tx of transactions) {
    const chain = normalizeChain(tx.blockchain)
    for (const addr of [tx.from?.address, tx.to?.address]) {
      if (!addr) continue
      const key = `${chain}:${String(addr).toLowerCase()}`
      if (!pairs.has(key)) pairs.set(key, { chain, address: String(addr).toLowerCase() })
    }
  }
  if (pairs.size === 0) return new Map()
  // Single IN query — addresses live across multiple chains so we filter
  // chain-side after fetch (cheaper than N round-trips).
  const allAddrs = [...new Set([...pairs.values()].map((p) => p.address))]
  // Also try original-case addresses in case the universe stored mixed case.
  const allAddrsCi = [...new Set(allAddrs.flatMap((a) => [a, a.toLowerCase()]))]
  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('chain, address, arkham_entity_name, arkham_entity_type, arkham_label')
    .in('address', allAddrsCi)
  if (error || !data) return new Map()
  const out = new Map()
  for (const row of data) {
    const key = `${row.chain}:${String(row.address).toLowerCase()}`
    out.set(key, row)
  }
  return out
}

/**
 * Save whale alerts to database
 */
async function saveWhaleAlerts(transactions) {
  if (!transactions || transactions.length === 0) {
    return { saved: 0, skipped: 0, enriched: 0 }
  }

  // Pre-fetch our entity labels for every (chain, address) in the batch
  // so we can stamp from_owner / to_owner with our better attribution
  // (Arkham-harvested) when Whale Alert returns a generic "unknown".
  const labelMap = await fetchUniverseLabels(transactions)
  let enriched = 0

  let saved = 0
  let skipped = 0
  
  for (const tx of transactions) {
    try {
      // Check if transaction already exists
      const { data: existing } = await supabaseAdmin
        .from('whale_alerts')
        .select('id')
        .eq('transaction_hash', tx.hash)
        .eq('blockchain', tx.blockchain)
        .single()
      
      if (existing) {
        skipped++
        continue
      }

      // Apply our entity attribution on top of Whale Alert's own labels.
      // Whale Alert often returns owner='unknown' for the second leg of
      // exchange flows; our tracked_address_universe has entity-grade
      // attribution for ~1830 addresses across 15 chains, so prefer it
      // whenever we have a hit.
      const chain = normalizeChain(tx.blockchain)
      const fromKey = tx.from?.address ? `${chain}:${String(tx.from.address).toLowerCase()}` : null
      const toKey = tx.to?.address ? `${chain}:${String(tx.to.address).toLowerCase()}` : null
      const fromHit = fromKey ? labelMap.get(fromKey) : null
      const toHit = toKey ? labelMap.get(toKey) : null
      const fromOwner = fromHit?.arkham_entity_name || tx.from?.owner || null
      const toOwner = toHit?.arkham_entity_name || tx.to?.owner || null
      const fromOwnerType = fromHit?.arkham_entity_type || tx.from?.owner_type || null
      const toOwnerType = toHit?.arkham_entity_type || tx.to?.owner_type || null
      if (fromHit || toHit) enriched++

      // Insert new whale alert
      const { error } = await supabaseAdmin
        .from('whale_alerts')
        .insert({
          transaction_hash: tx.hash,
          blockchain: tx.blockchain,
          symbol: tx.symbol,
          amount: tx.amount,
          amount_usd: tx.amount_usd,
          from_address: tx.from?.address || null,
          to_address: tx.to?.address || null,
          from_owner: fromOwner,
          to_owner: toOwner,
          from_owner_type: fromOwnerType,
          to_owner_type: toOwnerType,
          transaction_type: tx.transaction_type || 'transfer',
          transaction_count: tx.transaction_count || 1,
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          raw_data: tx
        })
      
      if (error) {
        console.error(`Error saving transaction ${tx.hash}:`, error)
      } else {
        saved++
      }
      
    } catch (err) {
      console.error(`Error processing transaction:`, err)
    }
  }
  
  return { saved, skipped, enriched }
}

/**
 * GET /api/whale-alerts/sync
 * Sync whale alerts from Whale Alert API (cron job)
 * Vercel Cron automatically authenticates this endpoint
 */
export async function GET(req) {
  try {
    // Vercel cron jobs are automatically authenticated
    // No additional auth needed when called from Vercel cron
    
    console.log('🐋 Starting whale alerts sync...')
    
    // Fetch whale transactions
    const transactions = await fetchWhaleAlerts()
    
    // Save to database
    const { saved, skipped, enriched } = await saveWhaleAlerts(transactions)

    console.log(`✅ Sync complete: ${saved} saved, ${skipped} skipped, ${enriched} arkham-enriched`)

    return NextResponse.json({
      success: true,
      saved,
      skipped,
      enriched,
      total: transactions.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Whale alerts sync error:', error)
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}

