import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Stablecoins to exclude from dashboard analytics
const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
    }

    // Use EXACT same pattern as /api/trades (which works!)
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    let q = supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,whale_score,to_address', { count: 'estimated' })
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')

    q = q.gte('timestamp', sinceIso)

    const { data: recentData, error: recentError } = await q.order('timestamp', { ascending: false }).limit(5000)

    console.log(`Dashboard API: Fetched ${recentData?.length || 0} transactions, error:`, recentError)

    if (recentError) {
      console.error('Dashboard API error:', recentError)
      return NextResponse.json({ error: recentError.message }, { status: 500 })
    }

    // Filter out stablecoins from analytics (but keep in raw transaction list)
    const analyticsData = (recentData || []).filter(t => !STABLECOINS.includes(t.token_symbol?.toUpperCase()))
    
    // Keep all data for recent transactions table (including stablecoins)
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
    
    console.log(`Dashboard API: ${recentData?.length || 0} total transactions, ${analyticsData.length} after filtering stablecoins`)

    console.log(`Dashboard API: Found ${recentData?.length || 0} total transactions, ${recent24h.length} in last 24h, showing ${recent.length}`)

    // Accurate 24h counts for totals and global buy/sell ratio
    let total24hCount = null
    let totalBuyCount24h = null
    let totalSellCount24h = null
    try {
      const [tot, buys, sells] = await Promise.all([
        supabaseAdmin.from('whale_transactions')
          .select('transaction_hash', { count: 'exact', head: true })
          .not('token_symbol', 'is', null)
          .not('token_symbol', 'ilike', 'unknown%')
          .gte('timestamp', sinceIso),
        supabaseAdmin.from('whale_transactions')
          .select('classification', { count: 'exact', head: true })
          .not('token_symbol', 'is', null)
          .not('token_symbol', 'ilike', 'unknown%')
          .gte('timestamp', sinceIso)
          .ilike('classification', 'buy%'),
        supabaseAdmin.from('whale_transactions')
          .select('classification', { count: 'exact', head: true })
          .not('token_symbol', 'is', null)
          .not('token_symbol', 'ilike', 'unknown%')
          .gte('timestamp', sinceIso)
          .ilike('classification', 'sell%')
      ])
      total24hCount = tot?.count ?? null
      totalBuyCount24h = buys?.count ?? null
      totalSellCount24h = sells?.count ?? null
    } catch {}

    // Use analytics data (stablecoins filtered out) for aggregation
    const aggData = analyticsData || []

    // Process the data we have (excluding stablecoins)

    const byCoin = new Map()
    const byCoinBuyCounts = new Map()
    const byCoinSellCounts = new Map()
    const byChain = new Map()
    const byTokenWhales = new Map()
    const byTokenVolume = new Map()
    const byTokenSignedValues = new Map()
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

      // Track token total traded volume (absolute)
      byTokenVolume.set(coin, (byTokenVolume.get(coin) || 0) + Math.abs(usdValue))
      // Track signed values for robust net computation per token
      if (!byTokenSignedValues.has(coin)) byTokenSignedValues.set(coin, [])
      byTokenSignedValues.get(coin).push(isSell ? -usdValue : usdValue)

      // Store transaction for momentum calculation
      allTransactions.push({ usd_value: usdValue, timestamp, klass })
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

    // Start with sample-based percents
    let topBuys = computeTopPercent('buy')
    let topSells = computeTopPercent('sell')

    // Correct percentages using exact 24h counts per token from Supabase (avoids sampling bias)
    try {
      const tokensForAccuracy = Array.from(byCoin.keys()).filter(t => t !== '—' && t !== 'UNKNOWN')
      const counts = await Promise.all(tokensForAccuracy.map(async (token) => {
        const [buys, sells] = await Promise.all([
          supabaseAdmin.from('whale_transactions')
            .select('transaction_hash', { count: 'exact', head: true })
            .eq('token_symbol', token)
            .gte('timestamp', sinceIso)
            .in('classification', ['BUY', 'buy']),
          supabaseAdmin.from('whale_transactions')
            .select('transaction_hash', { count: 'exact', head: true })
            .eq('token_symbol', token)
            .gte('timestamp', sinceIso)
            .in('classification', ['SELL', 'sell']),
        ])
        return { token, buys: Number(buys?.count || 0), sells: Number(sells?.count || 0) }
      }))
      const accurate = counts
        .map(({ token, buys, sells }) => {
          const denom = buys + sells
          // Require at least 3 transactions to show in top buys/sells (avoid misleading 100% from 1-2 txs)
          if (denom < 3) return null
          return {
            token,
            buyPct: +(buys / denom * 100).toFixed(1),
            sellPct: +(sells / denom * 100).toFixed(1),
            totalTxs: denom
          }
        })
        .filter(Boolean)

      topBuys = accurate
        .map(x => ({ coin: x.token, percentage: x.buyPct, count: x.totalTxs }))
        .sort((a,b)=> b.percentage - a.percentage)
        .slice(0, 10)
      topSells = accurate
        .map(x => ({ coin: x.token, percentage: x.sellPct, count: x.totalTxs }))
        .sort((a,b)=> b.percentage - a.percentage)
        .slice(0, 10)
    } catch {}

    const blockchainVolume = {
      labels: Array.from(byChain.keys()),
      data: Array.from(byChain.values()),
    }

    // Calculate market sentiment using the global 24h buy/sell counts when available
    let buyRatio = 50 // default neutral
    let trend = 'neutral'
    {
      const hasGlobal = Number.isFinite(Number(totalBuyCount24h)) && Number.isFinite(Number(totalSellCount24h))
      if (hasGlobal) {
        const denom = Number(totalBuyCount24h) + Number(totalSellCount24h)
        if (denom > 0) {
          buyRatio = (Number(totalBuyCount24h) / denom) * 100
          if (buyRatio > 60) trend = 'bullish'
          else if (buyRatio < 40) trend = 'bearish'
        }
      } else {
        let totalBuyCount = 0
        let totalSellCount = 0
        for (const [, buys] of byCoinBuyCounts.entries()) totalBuyCount += buys
        for (const [, sells] of byCoinSellCounts.entries()) totalSellCount += sells
        const denom = totalBuyCount + totalSellCount
        if (denom > 0) {
          buyRatio = (totalBuyCount / denom) * 100
        if (buyRatio > 60) trend = 'bullish'
        else if (buyRatio < 40) trend = 'bearish'
        }
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

    // Build 24h time series (per hour) for volume and count
    const now = Date.now()
    const hourMs = 60 * 60 * 1000
    const seriesBuckets = Array.from({ length: 24 }, (_, i) => ({
      start: now - (23 - i) * hourMs,
      end: now - (22 - i) * hourMs,
      volume: 0,
      count: 0,
    }))
    for (const t of allTransactions) {
      const ts = new Date(t.timestamp).getTime()
      const idxFloat = (ts - (now - 24 * hourMs)) / hourMs
      const idx = Math.floor(idxFloat)
      if (idx >= 0 && idx < 24) {
        seriesBuckets[idx].volume += Number(t.usd_value) || 0
        seriesBuckets[idx].count += 1
      }
    }
    const timeSeries = {
      labels: seriesBuckets.map(b => {
        const d = new Date(b.start)
        const hh = String(d.getHours()).padStart(2, '0')
        return `${hh}:00`
      }),
      volume: seriesBuckets.map(b => Math.round(b.volume)),
      count: seriesBuckets.map(b => b.count),
    }

    // Overall buy/sell counts and volumes
    let totalBuyCount = 0, totalSellCount = 0, totalBuyVolume = 0, totalSellVolume = 0
    for (const tx of allTransactions) {
      if (tx.klass === 'buy') { totalBuyCount++; totalBuyVolume += Number(tx.usd_value) || 0 }
      else if (tx.klass === 'sell') { totalSellCount++; totalSellVolume += Number(tx.usd_value) || 0 }
    }
    const overall = {
      totalCount: allTransactions.length,
      totalVolume: Math.round(allTransactions.reduce((s, t) => s + (Number(t.usd_value) || 0), 0)),
      buyCount: totalBuyCount,
      sellCount: totalSellCount,
      buyVolume: Math.round(totalBuyVolume),
      sellVolume: Math.round(totalSellVolume),
    }
    if (Number.isFinite(Number(total24hCount)) && Number(total24hCount) > 0) {
      overall.totalCount = Number(total24hCount)
    }

    // Top 10 largest transactions (24h) for Risk Assessment
    const topHighValueTxs = (recent24h || [])
      .filter(t => Number(t.usd_value || 0) > 0)
      .filter(t => String(t.token_symbol || '').trim().toUpperCase() !== 'OXT')
      .slice()
      .sort((a, b) => Number(b.usd_value || 0) - Number(a.usd_value || 0))
      .slice(0, 10)
      .map(t => ({
        time: t.timestamp,
        coin: String(t.token_symbol || '—').trim().toUpperCase(),
        side: String(t.classification || '').trim().toUpperCase(),
        usd: Math.round(Number(t.usd_value || 0)),
        chain: t.blockchain || '—',
        hash: t.transaction_hash || null,
        whale_score: Number(t.whale_score || 0)
      }))

    // Robust net flow per token: remove extreme outliers via IQR fence, then 5% trimmed sum
    function quantile(sorted, q) {
      if (!sorted || sorted.length === 0) return 0
      const pos = (sorted.length - 1) * q
      const base = Math.floor(pos)
      const rest = pos - base
      if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base])
      return sorted[base]
    }
    function robustNet(values) {
      if (!values || values.length === 0) return 0
      const abs = values.map(v => Math.abs(Number(v) || 0)).filter(v => Number.isFinite(v)).sort((a, b) => a - b)
      if (abs.length === 0) return 0
      const q1 = quantile(abs, 0.25)
      const q3 = quantile(abs, 0.75)
      const iqr = q3 - q1
      const upper = q3 + 3 * iqr
      const filtered = values.filter(v => Math.abs(Number(v) || 0) <= upper)
      if (filtered.length <= 5) return filtered.reduce((s, v) => s + (Number(v) || 0), 0)
      const arr = filtered.slice().sort((a, b) => Math.abs(a) - Math.abs(b))
      const trim = Math.max(1, Math.floor(arr.length * 0.05))
      const core = arr.slice(trim, arr.length - trim)
      return core.reduce((s, v) => s + (Number(v) || 0), 0)
    }

    // Token leaders by net flow (top 10)
    const tokenAggregate = Array.from(byTokenWhales.entries()).map(([token, data]) => {
      const signed = byTokenSignedValues.get(token) || []
      const robustNetValue = robustNet(signed)
      return {
        token,
        netUsd: Math.round(data.netUsd),
        netUsdRobust: Math.round(robustNetValue),
        buys: data.buys,
        sells: data.sells,
        uniqueWhales: data.whales.size,
        volume: Math.round(byTokenVolume.get(token) || 0),
        txCount: signed.length,
      }
    })
    const MIN_TX = 3
    const tokenLeaders = tokenAggregate
      .filter(t => t.txCount >= MIN_TX)
      .slice().sort((a, b) => b.netUsdRobust - a.netUsdRobust)
      .slice(0, 10)
    let tokenInflows = tokenAggregate
      .filter(t => t.txCount >= MIN_TX && t.netUsdRobust > 0)
      .sort((a, b) => b.netUsdRobust - a.netUsdRobust)
      .slice(0, 10)
    const tokenOutflows = tokenAggregate
      .filter(t => t.txCount >= MIN_TX && t.netUsdRobust < 0)
      .sort((a, b) => a.netUsdRobust - b.netUsdRobust)
      .slice(0, 10)

    // Prepare whale activity data safely
    const whaleActivity = Array.from(byTokenWhales.entries()).map(([token, data]) => ({
      token,
      uniqueWhales: data.whales.size,
      netUsd: Math.round(data.netUsd),
      buySellRatio: data.sells === 0 ? data.buys : +(data.buys / data.sells).toFixed(2)
    })).sort((a, b) => b.uniqueWhales - a.uniqueWhales).slice(0, 12)

    // Most traded tokens by count (from 24h dataset)
    const topTokens = Array.from(byCoin.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
    const tokenTradeCounts = { labels: topTokens.map(t => t[0]), data: topTokens.map(t => t[1]) }

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
      timeSeries,
      tokenLeaders,
      tokenInflows: tokenInflows.filter(t => String(t.token || '').toUpperCase() !== 'OXT'),
      tokenOutflows,
      overall,
      topHighValueTxs,
      tokenTradeCounts,
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