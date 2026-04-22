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
      .from('all_whale_transactions')
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

    // Determine sentiment label (neutral inflow/outflow vocabulary).
    // NOTE: Do NOT reintroduce 'BULLISH' / 'BEARISH' here — those are
    // directional opinions that meet the FCA RAO Art. 53 / SEC IA Act
    // §202(a)(11) / MiFID II Art. 4(1)(4) definition of an investment
    // recommendation, and Sonar Tracker is not a registered investment
    // adviser in any jurisdiction. See LEGAL_AUDIT_2026-04-21.md.
    let sentiment = 'NEUTRAL'
    if (buyPct > 60) {
      sentiment = 'NET INFLOW'
    } else if (sellPct > 60) {
      sentiment = 'NET OUTFLOW'
    }

    // Determine flow signal (descriptive on-chain pattern).
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
      // Recommendations REMOVED 2026-04-22. The previous generator emitted
      // 'BUY' / 'AVOID' / position-sizing / stop-loss / price-target text
      // ("Use 3-5% stop-loss", "Target 15-25% upside", "Enter on pullbacks",
      // "Consider short positions"). That is unambiguous unregistered
      // investment advice under SEC IA Act §202(a)(11) and FCA RAO Art. 53.
      // The replacement is a neutral, descriptive disclaimer.
      // See LEGAL_AUDIT_2026-04-21.md and /memories/repo/legal-remediation-2026-04-21.md.
      disclaimer:
        'This is descriptive on-chain data for informational purposes only. It is not a recommendation to buy, sell, or hold any asset, and Sonar Tracker is not a registered investment adviser in any jurisdiction. Past on-chain patterns do not guarantee future price movement. Please consult a licensed financial adviser before making investment decisions.'
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
      icon: 'flow',
      title: 'Significant Capital Flow',
      description: `${netFlow > 0 ? 'Net inflow' : 'Net outflow'} of ${formatUSD(Math.abs(netFlow))} observed. ${netFlow > 0 ? 'Whale wallets show net deposits' : 'Whale wallets show net withdrawals'}. Descriptive on-chain data only.`
    })
  }

  // Buy/sell pressure
  if (buyPct > 65) {
    insights.push({
      icon: 'pressure-up',
      title: 'High Inflow Share',
      description: `${buyPct}% of whale transactions in the last 24h were classified as inflows. Descriptive metric — not a recommendation.`
    })
  } else if (sellPct > 65) {
    insights.push({
      icon: 'pressure-down',
      title: 'High Outflow Share',
      description: `${sellPct}% of whale transactions in the last 24h were classified as outflows. Descriptive metric — not a recommendation.`
    })
  }

  // Whale participation
  if (whaleCount > 15) {
    insights.push({
      icon: 'whales-high',
      title: 'High Whale Activity',
      description: `${whaleCount} unique large-holder wallets transacted in the last 24h. Elevated on-chain participation.`
    })
  } else if (whaleCount < 5) {
    insights.push({
      icon: 'whales-low',
      title: 'Limited Whale Activity',
      description: `Only ${whaleCount} unique large-holder wallets detected. Low on-chain participation may indicate reduced liquidity.`
    })
  }

  // Momentum
  if (momentum > 5) {
    insights.push({
      icon: 'trend-up',
      title: 'Inflow Momentum (6h)',
      description: `Net inflows accelerated in the last 6 hours (+${momentum} net inflow transactions). Descriptive observation — past patterns do not predict future prices.`
    })
  } else if (momentum < -5) {
    insights.push({
      icon: 'trend-down',
      title: 'Outflow Momentum (6h)',
      description: `Net outflows accelerated in the last 6 hours (${momentum} net outflow transactions). Descriptive observation — past patterns do not predict future prices.`
    })
  }

  // Volume insight
  if (volume > 10000000) {
    insights.push({
      icon: 'volume-high',
      title: 'Exceptional Volume',
      description: `${formatUSD(volume)} in 24h whale volume. High transaction magnitude from large-holder wallets.`
    })
  }

  return insights
}

// generateRecommendation() removed 2026-04-22. See route export above for
// the replacement neutral disclaimer.

function formatUSD(value) {
  const num = Number(value)
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`
  }
  return `$${num.toFixed(0)}`
}

