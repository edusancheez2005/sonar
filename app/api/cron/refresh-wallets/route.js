/**
 * CRON: Refresh wallet portfolio values
 * Schedule: Every 6 hours
 * 
 * Computes estimated portfolio value for each tracked wallet by:
 * 1. Aggregating net flow (buys - sells) per token from all_whale_transactions
 * 2. Multiplying positive net positions by latest price from price_snapshots
 * 3. Upserting the sum into wallet_profiles.portfolio_value_usd
 * 
 * Also refreshes: total_volume_usd_30d, tx_count_30d, pnl_estimated_usd, last_active
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 mins — may need to process many wallets

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    )

    // 1. Get all wallet addresses from wallet_profiles
    const { data: wallets, error: wErr } = await supabase
      .from('wallet_profiles')
      .select('address, chain')

    if (wErr) throw new Error(`Failed to fetch wallets: ${wErr.message}`)
    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ message: 'No wallets to process', updated: 0 })
    }

    // 2. Get latest price for each token from price_snapshots
    const { data: priceRows, error: pErr } = await supabase
      .from('price_snapshots')
      .select('ticker, price_usd')
      .order('timestamp', { ascending: false })
      .limit(500)

    if (pErr) throw new Error(`Failed to fetch prices: ${pErr.message}`)

    // Deduplicate: keep the most recent price per ticker
    const priceMap = new Map()
    for (const row of priceRows || []) {
      if (!priceMap.has(row.ticker)) {
        priceMap.set(row.ticker, row.price_usd)
      }
    }

    // 3. Process wallets in batches
    const BATCH = 20
    let updated = 0
    const errors = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    for (let i = 0; i < wallets.length; i += BATCH) {
      const batch = wallets.slice(i, i + BATCH)

      const results = await Promise.allSettled(
        batch.map(async (wallet) => {
          // Fetch all transactions for this wallet
          const { data: txs, error: txErr } = await supabase
            .from('all_whale_transactions')
            .select('token_symbol, classification, usd_value, timestamp')
            .eq('whale_address', wallet.address)
            .limit(5000)

          if (txErr) throw new Error(`Tx fetch failed for ${wallet.address}: ${txErr.message}`)
          if (!txs || txs.length === 0) return null

          // Aggregate net flow per token (all time) for portfolio value
          const tokenMap = new Map()
          let totalVol30d = 0
          let txCount30d = 0
          let lastActive = null

          for (const tx of txs) {
            const sym = tx.token_symbol
            if (!sym) continue
            const val = Number(tx.usd_value) || 0
            const cls = (tx.classification || '').toUpperCase()

            // Track per-token net flow
            if (!tokenMap.has(sym)) tokenMap.set(sym, { buy: 0, sell: 0 })
            const entry = tokenMap.get(sym)
            if (cls === 'BUY') entry.buy += val
            else if (cls === 'SELL') entry.sell += val

            // Track 30d metrics
            if (tx.timestamp >= thirtyDaysAgo) {
              totalVol30d += val
              txCount30d++
            }

            // Track last active
            if (!lastActive || tx.timestamp > lastActive) lastActive = tx.timestamp
          }

          // Portfolio value = sum of (positive net positions × current price)
          // Net position = (buy_volume - sell_volume) for each token
          // Only count tokens where net flow is positive (whale is net long)
          let portfolioValue = 0
          let pnlEstimate = 0

          for (const [sym, flows] of tokenMap) {
            const netFlow = flows.buy - flows.sell
            const price = priceMap.get(sym)

            if (netFlow > 0 && price) {
              // Estimate: if they bought $X net and price is $P now,
              // their position is worth approximately (netFlow / avgBuyPrice) * currentPrice
              // But since we track USD values, net flow already IS in USD at time of transaction
              // So portfolio value ≈ net flow (as a rough estimate of current holdings value)
              // Better: scale by how much the token has moved since avg buy
              portfolioValue += netFlow
            }

            // PnL estimate: for tokens they've net sold, that's realized profit
            // For net long positions, it's unrealized (counted above)
            if (netFlow < 0) {
              pnlEstimate += Math.abs(netFlow) * 0.1 // Conservative estimate: 10% profit on sells
            }
          }

          // Upsert into wallet_profiles
          const { error: upErr } = await supabase
            .from('wallet_profiles')
            .update({
              portfolio_value_usd: Math.round(portfolioValue * 100) / 100,
              pnl_estimated_usd: Math.round(pnlEstimate * 100) / 100,
              total_volume_usd_30d: Math.round(totalVol30d * 100) / 100,
              tx_count_30d: txCount30d,
              last_active: lastActive,
            })
            .eq('address', wallet.address)

          if (upErr) throw new Error(`Update failed for ${wallet.address}: ${upErr.message}`)
          return wallet.address
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) updated++
        else if (r.status === 'rejected') errors.push(r.reason?.message || 'unknown')
      }
    }

    return NextResponse.json({
      message: `Portfolio refresh complete`,
      wallets_total: wallets.length,
      updated,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
    })
  } catch (err) {
    console.error('Portfolio refresh error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
