import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

/**
 * Whale Alert API Integration
 * Syncs real-time whale transactions from Whale Alert API
 * API Key: Set via WHALE_ALERT_API_KEY env var
 * 
 * NOTE: Whale Alert tracks major blockchains and ERC-20 tokens only
 * Supported: Ethereum, Bitcoin, Tron, Ripple, BSC, etc.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Use environment variable or fallback
const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY || ''
const WHALE_ALERT_BASE_URL = 'https://api.whale-alert.io/v1'

// Whale Alert Free plan limits (verified 2026-04-30):
//   - max start lookback: 3600 seconds (1 hour)
//   - min transaction value: $500,000
//   - rate limit: ~10 requests / minute
// Going outside these returns HTTP 400 ("value out of range") or 429
// ("usage limit reached"). The previous code requested a 6h window with
// $100k min — that 400'd silently from 2026-03-25 onward, leaving the
// `whale_alerts` table frozen for over a month and breaking ORCA's
// multi-chain whale section for BTC / XRP / TRX / SOL / native ETH.
const MIN_VALUE_USD = 500000   // Free plan minimum
const LOOKBACK_SECONDS = 3600  // Free plan maximum (1 hour)

/**
 * Fetch recent whale transactions from Whale Alert API
 */
async function fetchWhaleAlerts() {
  try {
    const now = Math.floor(Date.now() / 1000)
    const start = now - LOOKBACK_SECONDS

    const url = `${WHALE_ALERT_BASE_URL}/transactions?api_key=${WHALE_ALERT_API_KEY}&start=${start}&min_value=${MIN_VALUE_USD}&limit=100`

    console.log(`📡 Whale Alert sync: $${(MIN_VALUE_USD/1000).toFixed(0)}k+ min, ${LOOKBACK_SECONDS/60}min window`)

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      // 429 = rate limit (transient, next cron will retry); 400 = bad params
      // (likely plan limits changed). Surface both clearly.
      console.error(`Whale Alert API ${response.status}: ${errorText.slice(0, 200)}`)
      throw new Error(`Whale Alert API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.transactions || data.transactions.length === 0) {
      console.log('ℹ️ No new whale transactions in window')
      return []
    }

    console.log(`✅ Fetched ${data.transactions.length} whale transactions`)
    return data.transactions
  } catch (error) {
    console.error('❌ Error fetching whale alerts:', error)
    throw error
  }
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

