import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    )

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

    // Get 24h transactions
    const { data: txns, error } = await supabase
      .from('whale_transactions')
      .select('token_symbol, usd_value, classification, whale_address, from_address, timestamp')
      .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(2000)

    if (error) throw error

    const transactions = txns || []
    const totalTransactions = transactions.length
    const totalVolumeUsd = transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.usd_value || 0)), 0)

    // Top tokens by volume
    const tokenMap = {}
    const whaleMap = {}
    let bullish = 0, bearish = 0, neutral = 0

    for (const tx of transactions) {
      const symbol = tx.token_symbol || 'UNKNOWN'
      const usd = Math.abs(Number(tx.usd_value || 0))
      const side = (tx.classification || '').toLowerCase()
      const addr = tx.whale_address || tx.from_address || ''

      // Token aggregation
      if (!tokenMap[symbol]) tokenMap[symbol] = { symbol, volume: 0, txCount: 0 }
      tokenMap[symbol].volume += usd
      tokenMap[symbol].txCount += 1

      // Whale aggregation
      if (addr) {
        if (!whaleMap[addr]) whaleMap[addr] = { address: addr, txCount: 0, totalVolume: 0 }
        whaleMap[addr].txCount += 1
        whaleMap[addr].totalVolume += usd
      }

      // Sentiment
      if (side === 'buy') bullish++
      else if (side === 'sell') bearish++
      else neutral++
    }

    const total = bullish + bearish + neutral || 1
    const topTokensByVolume = Object.values(tokenMap)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
      .map(t => ({ symbol: t.symbol, volume: Math.round(t.volume), txCount: t.txCount }))

    const topWhalesByActivity = Object.values(whaleMap)
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 5)
      .map(w => ({
        address: w.address.substring(0, 6) + '...' + w.address.substring(w.address.length - 4),
        txCount: w.txCount,
        totalVolume: Math.round(w.totalVolume),
      }))

    return NextResponse.json({
      date: today,
      totalTransactions,
      totalVolumeUsd: Math.round(totalVolumeUsd),
      topTokensByVolume,
      topWhalesByActivity,
      sentiment: {
        bullish: Math.round((bullish / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        bearish: Math.round((bearish / total) * 100),
      },
      source: 'sonartracker.io',
      attribution: 'Data by Sonar Tracker — https://www.sonartracker.io',
    }, { headers })

  } catch (err) {
    console.error('Whale index error:', err)

    // Fallback with indication that live data is unavailable
    const today = new Date().toISOString().split('T')[0]
    return NextResponse.json({
      date: today,
      totalTransactions: 0,
      totalVolumeUsd: 0,
      topTokensByVolume: [],
      topWhalesByActivity: [],
      sentiment: { bullish: 0, neutral: 0, bearish: 0 },
      source: 'sonartracker.io',
      attribution: 'Data by Sonar Tracker — https://www.sonartracker.io',
      note: 'Live data temporarily unavailable',
    }, { headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
