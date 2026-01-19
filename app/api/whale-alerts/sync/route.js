import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

/**
 * Whale Alert API Integration
 * Syncs real-time whale transactions from Whale Alert API
 * API Key: ioqSOvTlUjNwbpoK2MFXUxg7LuS1nJaL
 * 
 * NOTE: Whale Alert tracks major blockchains and ERC-20 tokens only
 * Supported: Ethereum, Bitcoin, Tron, Ripple, BSC, etc.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Use environment variable or fallback
const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY || 'ioqSOvTlUjNwbpoK2MFXUxg7LuS1nJaL'
const WHALE_ALERT_BASE_URL = 'https://api.whale-alert.io/v1'

// Minimum transaction value to track (in USD)
// Free tier: $500k minimum, paid tier: can be lower
const MIN_VALUE_USD = 500000 // $500k+ (free tier requirement)

/**
 * Fetch recent whale transactions from Whale Alert API
 */
async function fetchWhaleAlerts() {
  try {
    // Get transactions from last 1 hour (free tier limit)
    const now = Math.floor(Date.now() / 1000)
    const start = now - 3600 // 1 hour ago (free tier allows 1 hour max)
    
    const url = `${WHALE_ALERT_BASE_URL}/transactions?api_key=${WHALE_ALERT_API_KEY}&start=${start}&min_value=${MIN_VALUE_USD}`
    
    console.log(`📡 Fetching whale alerts from Whale Alert API...`)
    console.log(`URL: ${WHALE_ALERT_BASE_URL}/transactions?api_key=***&start=${start}&min_value=${MIN_VALUE_USD}`)
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Response: ${errorText}`)
      throw new Error(`Whale Alert API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.transactions || data.transactions.length === 0) {
      console.log('ℹ️ No new whale transactions found')
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

