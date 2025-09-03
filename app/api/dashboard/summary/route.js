import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
    }

    // Get data from last 24 hours only
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Fetch recent transactions (last 10) - handle case where no data exists
    const { data: recentData, error: recentError } = await supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash, timestamp, token_symbol, classification, blockchain, usd_value, from_address')
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .not('classification', 'ilike', 'transfer')
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false })
      .limit(10)

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

    const recent = (recentData || []).map((t) => ({
      transaction_hash: t.transaction_hash,
      time: t.timestamp,
      coin: t.token_symbol,
      action: (t.classification || '').toUpperCase(),
      blockchain: t.blockchain,
      usd_value: Number(t.usd_value || 0),
      from_address: t.from_address || null,
    }))

    // Get aggregated data from last 24 hours for all insights
    const { data: aggData, error: aggError } = await supabaseAdmin
      .from('whale_transactions')
      .select('token_symbol, classification, usd_value, blockchain, timestamp, from_address')
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false })

    if (aggError) {
      console.error('Error fetching aggregated data:', aggError)
      // Return basic data with empty insights
      return NextResponse.json({
        recent,
        topBuys: [],
        topSells: [],
        blockchainVolume: { labels: [], data: [] },
        marketSentiment: { ratio: 50, trend: 'neutral' },
        riskMetrics: { highValueCount: 0, avgTransactionSize: 0 },
        marketMomentum: { volumeChange: 0, activityChange: 0 },
        whaleActivity: []
      })
    }

    const byCoin = new Map()
    const byCoinBuyCounts = new Map()
    const byCoinSellCounts = new Map()
    const byChain = new Map()
    const byTokenWhales = new Map()
    const allTransactions = []

    // Process aggregated data safely
    for (const row of aggData || []) {
      const coin = row.token_symbol || '—'
      const chain = row.blockchain || '—'
      const usdValue = Number(row.usd_value || 0)
      const timestamp = row.timestamp
      const fromAddress = row.from_address || ''
      
      byChain.set(chain, (byChain.get(chain) || 0) + 1)

      const klass = (row.classification || '').toLowerCase()
      if (klass === 'buy') byCoinBuyCounts.set(coin, (byCoinBuyCounts.get(coin) || 0) + 1)
      else if (klass === 'sell') byCoinSellCounts.set(coin, (byCoinSellCounts.get(coin) || 0) + 1)
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

    function topPercent(mapCounts) {
      const entries = Array.from(mapCounts.entries())
      const results = entries.map(([coin, count]) => {
        const total = byCoin.get(coin) || 1
        const pct = (count / total) * 100
        return { coin, percentage: Number(pct.toFixed(1)) }
      })
      results.sort((a, b) => b.percentage - a.percentage)
      return results.slice(0, 10)
    }

    const topBuys = topPercent(byCoinBuyCounts)
    const topSells = topPercent(byCoinSellCounts)

    const blockchainVolume = {
      labels: Array.from(byChain.keys()),
      data: Array.from(byChain.values()),
    }

    // Calculate market sentiment safely
    let buyRatio = 50 // default neutral
    let trend = 'neutral'
    if (topBuys.length > 0 && topSells.length > 0) {
      const totalBuys = topBuys.reduce((sum, item) => sum + item.percentage, 0)
      const totalSells = topSells.reduce((sum, item) => sum + item.percentage, 0)
      if (totalBuys + totalSells > 0) {
        buyRatio = totalBuys / (totalBuys + totalSells) * 100
        if (buyRatio > 60) trend = 'bullish'
        else if (buyRatio < 40) trend = 'bearish'
      }
    }

    // Calculate risk metrics safely
    const highValueTxs = allTransactions.filter(t => t.usd_value > 1000000).length
    const avgSize = allTransactions.length > 0 ? allTransactions.reduce((sum, t) => sum + t.usd_value, 0) / allTransactions.length : 0

    // Calculate market momentum safely
    let volumeChange = 0
    if (allTransactions.length > 0) {
      const sortedTransactions = allTransactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const firstHour = sortedTransactions.slice(0, Math.ceil(sortedTransactions.length * 0.1))
      const lastHour = sortedTransactions.slice(-Math.ceil(sortedTransactions.length * 0.1))
      const firstHourVolume = firstHour.reduce((sum, t) => sum + t.usd_value, 0)
      const lastHourVolume = lastHour.reduce((sum, t) => sum + t.usd_value, 0)
      if (firstHourVolume > 0) {
        volumeChange = ((lastHourVolume - firstHourVolume) / firstHourVolume) * 100
      }
    }

    // Prepare whale activity data safely
    const whaleActivity = Array.from(byTokenWhales.entries()).map(([token, data]) => ({
      token,
      uniqueWhales: data.whales.size,
      netUsd: Math.round(data.netUsd),
      buySellRatio: data.sells === 0 ? data.buys : +(data.buys / data.sells).toFixed(2)
    })).sort((a, b) => b.uniqueWhales - a.uniqueWhales).slice(0, 12)

    return NextResponse.json({ 
      recent, 
      topBuys, 
      topSells, 
      blockchainVolume,
      marketSentiment: { ratio: buyRatio, trend },
      riskMetrics: { highValueCount: highValueTxs, avgTransactionSize: avgSize },
      marketMomentum: { volumeChange, activityChange: allTransactions.length },
      whaleActivity
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
      whaleActivity: []
    })
  }
} 