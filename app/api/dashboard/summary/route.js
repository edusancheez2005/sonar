import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const nowIso = new Date().toISOString()

    // Fetch recent transactions strictly from the last 24 hours
    const { data: recentData, error: recentError } = await supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash, timestamp, token_symbol, classification, blockchain, usd_value, from_address, whale_score, to_address')
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .gte('timestamp', since24h)
      .lte('timestamp', nowIso)
      .order('timestamp', { ascending: false })
      .limit(1000)

    console.log(`Dashboard API: Fetched ${recentData?.length || 0} transactions from Supabase, error:`, recentError)

    if (recentError) {
      console.error('Error fetching recent transactions:', recentError)
      // Return empty data instead of error
      return NextResponse.json({
        recent: [],
        topBuys: [],
        topSells: [],
        blockchainVolume: { labels: [], data: [] },
        marketSentiment: { ratio: 50, trend: 'neutral' },
        riskMetrics: { highValueCount: 0, avgTransactionSize: 0 },
        marketMomentum: { volumeChange: 0, activityChange: 0 },
        whaleActivity: []
      })
    }

    // Data is already scoped to the last 24 hours, now take top 10 for the recent table
    const recent24h = recentData || []
    const recent = recent24h.slice(0, 10).map((t) => ({
      transaction_hash: t.transaction_hash,
      time: t.timestamp,
      coin: t.token_symbol,
      action: (t.classification || '').toUpperCase(),
      blockchain: t.blockchain,
      usd_value: Number(t.usd_value || 0),
      from_address: t.from_address || null,
      to_address: t.to_address || null,
      whale_score: Number(t.whale_score || 0),
    }))

    console.log(`Dashboard API: Found ${recentData?.length || 0} total transactions, ${recent24h.length} in last 24h, showing ${recent.length}`)

    // Use the 24-hour filtered data for aggregation
    const aggData = recent24h || []

    // Process the data we have

    const byCoin = new Map()
    const byCoinBuyCounts = new Map()
    const byCoinSellCounts = new Map()
    const byChain = new Map()
    const byTokenWhales = new Map()
    const allTransactions = []

    // Process aggregated data safely
    for (const row of aggData || []) {
      const coin = String(row.token_symbol || '—').trim().toUpperCase()
      const chain = row.blockchain || '—'
      const usdValue = Number(row.usd_value || 0)
      const timestamp = row.timestamp
      const fromAddress = row.from_address || ''
      
      byChain.set(chain, (byChain.get(chain) || 0) + 1)

      const klass = String(row.classification || '').trim().toLowerCase()
      const isBuy = klass.startsWith('buy')
      const isSell = klass.startsWith('sell')
      if (isBuy) byCoinBuyCounts.set(coin, (byCoinBuyCounts.get(coin) || 0) + 1)
      else if (isSell) byCoinSellCounts.set(coin, (byCoinSellCounts.get(coin) || 0) + 1)
      byCoin.set(coin, (byCoin.get(coin) || 0) + 1)

      // Track whale activity per token
      if (!byTokenWhales.has(coin)) {
        byTokenWhales.set(coin, { whales: new Set(), netUsd: 0, buys: 0, sells: 0 })
      }
      const tokenData = byTokenWhales.get(coin)
      tokenData.whales.add(fromAddress)
      if (klass === 'buy') {
        tokenData.buys += 1
        tokenData.netUsd += usdValue
      } else if (klass === 'sell') {
        tokenData.sells += 1
        tokenData.netUsd -= usdValue
      }

      // Store transaction for momentum calculation
      allTransactions.push({ usd_value: usdValue, timestamp })
    }

    function computeTopPercent(type) {
      const coins = new Set([...byCoinBuyCounts.keys(), ...byCoinSellCounts.keys()])
      const results = []
      for (const coin of coins) {
        const buys = Number(byCoinBuyCounts.get(coin) || 0)
        const sells = Number(byCoinSellCounts.get(coin) || 0)
        const denom = buys + sells
        if (denom === 0) continue
        const numerator = type === 'buy' ? buys : sells
        let pct = (numerator / denom) * 100
        if (!Number.isFinite(pct)) pct = 0
        results.push({ coin, percentage: Number(pct.toFixed(1)) })
      }
      results.sort((a, b) => b.percentage - a.percentage)
      return results.slice(0, 10)
    }

    const topBuys = computeTopPercent('buy')
    const topSells = computeTopPercent('sell')

    const blockchainVolume = {
      labels: Array.from(byChain.keys()),
      data: Array.from(byChain.values()),
    }

    // Calculate market sentiment based on raw buy/sell counts
    let buyRatio = 50 // default neutral
    let trend = 'neutral'
    {
      let totalBuyCount = 0
      let totalSellCount = 0
      for (const [coin, buys] of byCoinBuyCounts.entries()) totalBuyCount += buys
      for (const [coin, sells] of byCoinSellCounts.entries()) totalSellCount += sells
      const denom = totalBuyCount + totalSellCount
      if (denom > 0) {
        buyRatio = (totalBuyCount / denom) * 100
        if (buyRatio > 60) trend = 'bullish'
        else if (buyRatio < 40) trend = 'bearish'
      }
    }

    // Calculate risk metrics with trimmed mean to reduce outlier impact
    const highValueTxs = allTransactions.filter(t => t.usd_value > 1000000).length
    let avgSize = 0
    if (allTransactions.length > 0) {
      const values = allTransactions
        .map(t => Number(t.usd_value) || 0)
        .filter(v => Number.isFinite(v) && v >= 0)
        .sort((a, b) => a - b)
      const trimCount = Math.floor(values.length * 0.05)
      const start = Math.min(trimCount, values.length - 1)
      const end = Math.max(values.length - trimCount, start + 1)
      const trimmed = values.slice(start, end)
      const sum = trimmed.reduce((s, v) => s + v, 0)
      avgSize = trimmed.length > 0 ? sum / trimmed.length : 0
    }

    // Calculate market momentum as last hour vs previous hour, with sane bounds
    let volumeChange = 0
    if (allTransactions.length > 0) {
      const nowMs = Date.now()
      const oneHourMs = 60 * 60 * 1000
      const lastHourStart = nowMs - oneHourMs
      const prevHourStart = nowMs - 2 * oneHourMs
      const lastHourVolume = allTransactions
        .filter(t => new Date(t.timestamp).getTime() >= lastHourStart)
        .reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
      const prevHourVolume = allTransactions
        .filter(t => {
          const ts = new Date(t.timestamp).getTime()
          return ts >= prevHourStart && ts < lastHourStart
        })
        .reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
      if (prevHourVolume > 0) {
        volumeChange = ((lastHourVolume - prevHourVolume) / prevHourVolume) * 100
        // Clamp to avoid absurd values from small denominators
        if (volumeChange > 500) volumeChange = 500
        if (volumeChange < -500) volumeChange = -500
      } else {
        volumeChange = 0
      }
    }

    // Prepare whale activity data safely
    const whaleActivity = Array.from(byTokenWhales.entries()).map(([token, data]) => ({
      token,
      uniqueWhales: data.whales.size,
      netUsd: Math.round(data.netUsd),
      buySellRatio: data.sells === 0 ? data.buys : +(data.buys / data.sells).toFixed(2)
    })).sort((a, b) => b.uniqueWhales - a.uniqueWhales).slice(0, 12)

    const noData24h = (recent24h || []).length === 0

    return NextResponse.json({ 
      recent, 
      topBuys, 
      topSells, 
      blockchainVolume,
      marketSentiment: { ratio: buyRatio, trend },
      riskMetrics: { highValueCount: highValueTxs, avgTransactionSize: avgSize },
      marketMomentum: { volumeChange, activityChange: allTransactions.length },
      whaleActivity,
      noData24h
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Unexpected error in dashboard summary:', error)
    // Return safe fallback data
    return NextResponse.json({
      recent: [],
      topBuys: [],
      topSells: [],
      blockchainVolume: { labels: [], data: [] },
      marketSentiment: { ratio: 50, trend: 'neutral' },
      riskMetrics: { highValueCount: 0, avgTransactionSize: 0 },
      marketMomentum: { volumeChange: 0, activityChange: 0 },
      whaleActivity: [],
      noData24h: true
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
} 