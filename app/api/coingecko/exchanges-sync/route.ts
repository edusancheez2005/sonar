/**
 * Exchanges Sync Cron Job
 * Syncs exchange data from CoinGecko to Supabase
 * Run via Vercel Cron: every 6 hours
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExchangesList, getExchangeById } from '@/lib/coingecko/client'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!

export async function GET(request: NextRequest) {
  try {
    // Get limit from query parameter (useful for testing or limiting during builds)
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
    
    // During build/validation, return quickly without syncing
    if (limit === 0) {
      console.log('⏭️ Skipping sync (limit=0)')
      return NextResponse.json({
        success: true,
        message: 'Sync skipped',
        timestamp: new Date().toISOString(),
      })
    }

    console.log('🔄 Starting exchanges sync...')

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Get list of all exchanges
    const exchangesList = await getExchangesList()
    const exchangesToSync = limit ? exchangesList.slice(0, limit) : exchangesList
    console.log(`📊 Found ${exchangesList.length} exchanges, syncing ${exchangesToSync.length}`)

    let synced = 0
    let failed = 0

    // Process exchanges in batches to respect rate limits
    const BATCH_SIZE = 10
    const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds

    for (let i = 0; i < exchangesToSync.length; i += BATCH_SIZE) {
      const batch = exchangesToSync.slice(i, i + BATCH_SIZE)
      
      const promises = batch.map(async (exchange) => {
        try {
          // Skip if no ID
          if (!exchange.id) {
            console.warn(`⚠️ Skipping exchange with no ID:`, exchange)
            return false
          }

          // Fetch detailed exchange data
          const details = await getExchangeById(exchange.id)

          // Prepare upsert data - use exchange.id from list, not details.id
          const exchangeData = {
            id: exchange.id, // Use ID from list, not from details
            name: details.name || exchange.name,
            image: details.image || null,
            url: details.url || null,
            country: details.country || null,
            year_established: details.year_established || null,
            centralized: details.centralized !== false, // Default to true
            trust_score_rank: details.trust_score_rank || null,
            trade_volume_24h_btc: details.trade_volume_24h_btc || null,
            trade_volume_24h_btc_normalized: details.trade_volume_24h_btc_normalized || null,
            updated_at: new Date().toISOString(),
            raw_json: details,
          }

          // Upsert to Supabase
          const { error } = await supabase
            .from('exchanges')
            .upsert(exchangeData, { onConflict: 'id' })

          if (error) {
            console.error(`❌ Failed to upsert ${exchange.id}:`, error)
            throw error
          }

          synced++
          return true
        } catch (error) {
          console.error(`❌ Error processing ${exchange.id}:`, error)
          failed++
          return false
        }
      })

      await Promise.allSettled(promises)

      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < exchangesToSync.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, exchangesToSync.length)}/${exchangesToSync.length}`)
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`)

    return NextResponse.json({
      success: true,
      total: exchangesList.length,
      processed: exchangesToSync.length,
      synced,
      failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Exchanges sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
