import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req) {
  try {
    const { symbol } = await req.json()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const tokenSymbol = symbol.toUpperCase()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const since6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

    // Fetch all 24h transactions for this token
    const { data: txs24h, error } = await supabaseAdmin
      .from('whale_transactions')
      .select('*')
      .eq('token_symbol', tokenSymbol)
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false })

    if (error) {
      throw error
    }

    if (!txs24h || txs24h.length === 0) {
      return NextResponse.json({
        symbol: tokenSymbol,
        analysis: 'No whale activity detected in the last 24 hours for this token.',
        hasData: false
      })
    }

    // Calculate metrics
    const buys = txs24h.filter(t => t.classification?.toUpperCase() === 'BUY')
    const sells = txs24h.filter(t => t.classification?.toUpperCase() === 'SELL')
    
    const buyCount = buys.length
    const sellCount = sells.length
    const totalTxs = buyCount + sellCount

    const buyVolume = buys.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
    const sellVolume = sells.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
    const netFlow = buyVolume - sellVolume
    const totalVolume = buyVolume + sellVolume

    const buyPct = totalTxs > 0 ? (buyCount / totalTxs * 100).toFixed(1) : 0
    const sellPct = totalTxs > 0 ? (sellCount / totalTxs * 100).toFixed(1) : 0

    // Unique whales
    const uniqueWhales = new Set(txs24h.map(t => t.from_address).filter(Boolean))

    // Recent 6h for momentum
    const txs6h = txs24h.filter(t => new Date(t.timestamp) >= new Date(since6h))
    const buys6h = txs6h.filter(t => t.classification?.toUpperCase() === 'BUY')
    const sells6h = txs6h.filter(t => t.classification?.toUpperCase() === 'SELL')
    const momentum6h = buys6h.length - sells6h.length

    // Determine sentiment
    let sentiment = 'NEUTRAL'
    let sentimentEmoji = '🟡'
    if (buyPct > 60) {
      sentiment = 'BULLISH'
      sentimentEmoji = '🟢'
    } else if (sellPct > 60) {
      sentiment = 'BEARISH'
      sentimentEmoji = '🔴'
    }

    // Determine signal
    let signal = 'NEUTRAL'
    if (netFlow > 0 && buyPct > 55) {
      signal = 'ACCUMULATION'
    } else if (netFlow < 0 && sellPct > 55) {
      signal = 'DISTRIBUTION'
    }

    // Average transaction size
    const avgBuySize = buyCount > 0 ? buyVolume / buyCount : 0
    const avgSellSize = sellCount > 0 ? sellVolume / sellCount : 0

    // Top transactions
    const topBuys = buys.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0)).slice(0, 3)
    const topSells = sells.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0)).slice(0, 3)

    // Generate professional analysis
    const fmt = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    
    const analysis = {
      symbol: tokenSymbol,
      sentiment,
      sentimentEmoji,
      signal,
      metrics: {
        totalTxs,
        buyCount,
        sellCount,
        buyPct: Number(buyPct),
        sellPct: Number(sellPct),
        buyVolume,
        sellVolume,
        netFlow,
        totalVolume,
        uniqueWhales: uniqueWhales.size,
        avgBuySize,
        avgSellSize,
        momentum6h
      },
      topBuys: topBuys.map(t => ({
        hash: t.transaction_hash,
        value: t.usd_value,
        timestamp: t.timestamp,
        whaleScore: t.whale_score
      })),
      topSells: topSells.map(t => ({
        hash: t.transaction_hash,
        value: t.usd_value,
        timestamp: t.timestamp,
        whaleScore: t.whale_score
      })),
      insights: generateInsights(sentiment, netFlow, buyPct, sellPct, uniqueWhales.size, momentum6h, totalVolume),
      recommendation: generateRecommendation(sentiment, signal, netFlow, buyPct, momentum6h, totalVolume)
    }

    return NextResponse.json({ ...analysis, hasData: true })

  } catch (error) {
    console.error('Orca token analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze token', message: error.message },
      { status: 500 }
    )
  }
}

function generateInsights(sentiment, netFlow, buyPct, sellPct, whaleCount, momentum, volume) {
  const insights = []

  // Flow insight
  if (Math.abs(netFlow) > 1000000) {
    insights.push({
      icon: '💰',
      title: 'Significant Capital Flow',
      description: `${netFlow > 0 ? 'Net inflow' : 'Net outflow'} of ${formatUSD(Math.abs(netFlow))} detected. ${netFlow > 0 ? 'Whales are accumulating' : 'Heavy distribution in progress'}.`
    })
  }

  // Buy/sell pressure
  if (buyPct > 65) {
    insights.push({
      icon: '📊',
      title: 'Strong Buy Pressure',
      description: `${buyPct}% of whale transactions are buys. Institutional-grade accumulation pattern detected.`
    })
  } else if (sellPct > 65) {
    insights.push({
      icon: '⚠️',
      title: 'Heavy Sell Pressure',
      description: `${sellPct}% of transactions are sells. Whales may be taking profits or derisking positions.`
    })
  }

  // Whale participation
  if (whaleCount > 15) {
    insights.push({
      icon: '🐋',
      title: 'High Whale Activity',
      description: `${whaleCount} unique whales are actively trading. Elevated institutional interest.`
    })
  } else if (whaleCount < 5) {
    insights.push({
      icon: '👀',
      title: 'Limited Whale Interest',
      description: `Only ${whaleCount} whales detected. Low institutional participation may indicate reduced liquidity.`
    })
  }

  // Momentum
  if (momentum > 5) {
    insights.push({
      icon: '📈',
      title: 'Positive Momentum',
      description: `Buy pressure increasing in the last 6 hours (+${momentum} net buys). Bullish continuation likely.`
    })
  } else if (momentum < -5) {
    insights.push({
      icon: '📉',
      title: 'Negative Momentum',
      description: `Sell pressure accelerating in the last 6 hours (${momentum} net sells). Bearish trend developing.`
    })
  }

  // Volume insight
  if (volume > 10000000) {
    insights.push({
      icon: '🔥',
      title: 'Exceptional Volume',
      description: `${formatUSD(volume)} in 24h whale volume. High conviction trading from major players.`
    })
  }

  return insights
}

function generateRecommendation(sentiment, signal, netFlow, buyPct, momentum, volume) {
  const recs = []

  if (sentiment === 'BULLISH' && signal === 'ACCUMULATION') {
    recs.push({
      type: 'BUY',
      confidence: 'HIGH',
      reasoning: 'Strong accumulation pattern with sustained whale buying. Consider building a position with tight risk management.',
      actions: [
        'Enter on pullbacks to support levels',
        'Use 3-5% stop-loss below recent lows',
        'Target 15-25% upside based on whale accumulation',
        'Scale in gradually as momentum continues'
      ]
    })
  } else if (sentiment === 'BEARISH' && signal === 'DISTRIBUTION') {
    recs.push({
      type: 'AVOID',
      confidence: 'HIGH',
      reasoning: 'Heavy whale distribution detected. Avoid new long positions until selling pressure subsides.',
      actions: [
        'Exit existing longs or tighten stops',
        'Consider short positions if risk-tolerant',
        'Wait for capitulation and reversal signals',
        'Monitor for support level breaks'
      ]
    })
  } else if (sentiment === 'NEUTRAL') {
    recs.push({
      type: 'WAIT',
      confidence: 'MEDIUM',
      reasoning: 'Mixed whale signals. No clear directional bias. Wait for confirmation before entering.',
      actions: [
        'Observe for trend development',
        'Wait for buyPct > 60% or sellPct > 60%',
        'Monitor volume for breakout signals',
        'Reduce position sizes if trading'
      ]
    })
  } else {
    // Moderate signals
    recs.push({
      type: 'CAUTIOUS',
      confidence: 'MEDIUM',
      reasoning: `Whale activity shows ${sentiment.toLowerCase()} bias but lacks strong conviction. Trade with reduced size.`,
      actions: [
        'Use smaller position sizes (25-50% normal)',
        'Set wider stops to account for volatility',
        'Wait for momentum confirmation',
        'Monitor for pattern strengthening'
      ]
    })
  }

  return recs[0]
}

function formatUSD(value) {
  const num = Number(value)
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`
  }
  return `$${num.toFixed(0)}`
}

