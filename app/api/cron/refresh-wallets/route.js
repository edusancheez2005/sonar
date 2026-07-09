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

    // 1. Choose which wallets to refresh this run. The table has ~42k rows
    //    and we can only process a slice per run, so prioritise wallets that
    //    actually traded recently (from the LIVE tape) — those are what users
    //    look at on the leaderboard / terminal. Among the active set we take
    //    the STALEST first (oldest updated_at) and bump updated_at on write,
    //    so coverage rotates and every active wallet stays fresh within a few
    //    runs. The old behaviour (arbitrary first 1000 by PK) left ~98% of
    //    active wallets stale for weeks.
    const REFRESH_CAP = 500
    const activeSince = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()

    let activeAddrs = []
    try {
      const { data: recent } = await supabase
        .from('all_whale_transactions')
        .select('whale_address')
        .gte('timestamp', activeSince)
        .order('timestamp', { ascending: false })
        .limit(30000)
      activeAddrs = [...new Set((recent || []).map((r) => r.whale_address).filter(Boolean))]
    } catch (e) {
      // Non-fatal: fall back to stale-rotation below.
    }

    // Fetch profile rows for the active addresses (chunked — `in` lists can't
    // be unbounded), carrying updated_at so we can refresh stalest-first.
    const walletMap = new Map()
    const CHUNK = 200
    for (let i = 0; i < activeAddrs.length; i += CHUNK) {
      const slice = activeAddrs.slice(i, i + CHUNK)
      const { data: rows } = await supabase
        .from('wallet_profiles')
        .select('address, chain, updated_at')
        .in('address', slice)
      for (const r of rows || []) walletMap.set(r.address, r)
    }

    let wallets = [...walletMap.values()].sort((a, b) => {
      const ta = a.updated_at ? Date.parse(a.updated_at) : 0
      const tb = b.updated_at ? Date.parse(b.updated_at) : 0
      return ta - tb // stalest first
    })

    // Top up with the globally stalest profiles so dormant wallets also cycle
    // through a refresh eventually.
    if (wallets.length < REFRESH_CAP) {
      const { data: stale } = await supabase
        .from('wallet_profiles')
        .select('address, chain, updated_at')
        .order('updated_at', { ascending: true, nullsFirst: true })
        .limit(REFRESH_CAP - wallets.length + 200)
      for (const r of stale || []) {
        if (!walletMap.has(r.address)) {
          walletMap.set(r.address, r)
          wallets.push(r)
        }
      }
    }

    wallets = wallets.slice(0, REFRESH_CAP)

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ message: 'No wallets to process', updated: 0 })
    }

    // Batch real holdings valuations from the labeled-address balance snapshot
    // so the leaderboard Portfolio column reflects actual balances (the
    // flow-derived estimate is 0 for net distributors).
    const balanceMap = new Map()
    {
      const addrs = wallets.map((w) => w.address)
      const BCHUNK = 200
      for (let i = 0; i < addrs.length; i += BCHUNK) {
        const slice = addrs.slice(i, i + BCHUNK)
        const { data: balRows } = await supabase
          .from('addresses')
          .select('address, balance_usd')
          .in('address', slice)
        for (const r of balRows || []) {
          const b = Number(r.balance_usd)
          if (Number.isFinite(b) && b > 0) balanceMap.set(r.address, Math.round(b * 100) / 100)
        }
      }
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
          // EXACT database aggregation via RPC (fixes the 1,000-row PostgREST
          // cap that truncated these stats — see 20260709_exact_aggregates.sql
          // and the 2026-07-09 data-quality audit). Net token holdings come
          // from whale_alerts (qty-based); 30d trading stats + per-token flows
          // from all_whale_transactions — all summed server-side.
          const [{ data: holdingsRows }, { data: statsRows }] = await Promise.all([
            supabase.rpc('wallet_alert_holdings', { p_address: wallet.address }),
            supabase.rpc('wallet_tx_stats', { p_address: wallet.address, p_since: thirtyDaysAgo }),
          ])
          const stats = Array.isArray(statsRows) ? statsRows[0] : statsRows

          // ── Portfolio value (net qty × current price) ─────────
          let portfolioValue = 0
          const topTokens = []
          for (const h of (holdingsRows || [])) {
            const sym = h.symbol
            if (!sym) continue
            const netQty = Number(h.net_qty) || 0
            const price = priceMap.get(sym)
            topTokens.push({ symbol: sym, volume: Math.abs(Number(h.gross_usd) || 0), netQty })
            if (netQty > 0 && price) portfolioValue += netQty * price
          }

          // ── Fallback: no whale_alerts holdings → per-token flows ─
          if (topTokens.length === 0) {
            const { data: flows } = await supabase.rpc('wallet_token_flows', {
              p_address: wallet.address,
              p_since: thirtyDaysAgo,
            })
            for (const f of (flows || [])) {
              const net = (Number(f.buy_usd) || 0) - (Number(f.sell_usd) || 0)
              topTokens.push({ symbol: f.token_symbol, volume: Number(f.total_usd) || 0, netQty: 0 })
              if (net > 0) portfolioValue += net
            }
          }

          // ── 30d metrics (exact) ───────────────────────────────
          const totalVol30d = stats ? Number(stats.total_volume) || 0 : 0
          const txCount30d = stats ? Number(stats.tx_count) || 0 : 0
          const lastActive = stats?.last_active || null

          // ── Last-ditch: gross 30d BUY volume as a portfolio floor
          //    so an active whale never reads "$0.00" for lack of a
          //    balance snapshot. An undercount, but factually true.
          if (portfolioValue === 0 && stats && Number(stats.buy_volume) > 0) {
            portfolioValue = Number(stats.buy_volume)
          }

          // Sort top tokens by volume descending, take top 5
          topTokens.sort((a, b) => b.volume - a.volume)
          const top5 = topTokens.slice(0, 5).map(t => t.symbol)

          // Refresh the cheap volatile stats. Realized PnL (pnl_estimated_usd)
          // is intentionally NOT recomputed here — it's price-aware/expensive
          // (CoinGecko) and recomputing it for every wallet inline blew past
          // the function time budget, which is what left wallets stale. It's
          // maintained out-of-band by /api/admin/backfill-wallet-pnl, and the
          // per-wallet page computes it live, so we leave the stored value
          // untouched here.
          const updateFields = {
            portfolio_value_usd: balanceMap.get(wallet.address) ?? (Math.round(portfolioValue * 100) / 100),
            total_volume_usd_30d: Math.round(totalVol30d * 100) / 100,
            tx_count_30d: txCount30d,
            last_active: lastActive,
            top_tokens: top5,
            updated_at: new Date().toISOString(),
          }
          const { error: upErr } = await supabase
            .from('wallet_profiles')
            .update(updateFields)
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
