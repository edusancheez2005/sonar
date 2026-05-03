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
 * Save whale alerts to database
 */
async function saveWhaleAlerts(transactions) {
  if (!transactions || transactions.length === 0) {
    return { saved: 0, skipped: 0 }
  }
  
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
          from_owner: tx.from?.owner || null,
          to_owner: tx.to?.owner || null,
          from_owner_type: tx.from?.owner_type || null,
          to_owner_type: tx.to?.owner_type || null,
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
  
  return { saved, skipped }
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
    const { saved, skipped } = await saveWhaleAlerts(transactions)
    
    console.log(`✅ Sync complete: ${saved} saved, ${skipped} skipped`)
    
    return NextResponse.json({
      success: true,
      saved,
      skipped,
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

