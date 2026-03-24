import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (
    !(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  const startingCapital = Math.max(1, Number(searchParams.get('starting_capital')) || 10000)
  const days = Math.min(365, Math.max(1, Number(searchParams.get('days')) || 30))

  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Fetch all BUY/SELL trades for this wallet in the time period
  const { data: trades, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, classification, usd_value, timestamp, blockchain, transaction_hash')
    .eq('whale_address', address)
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
    .order('timestamp', { ascending: true })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!trades || trades.length === 0) {
    return NextResponse.json({
      total_pnl: 0,
      pnl_pct: 0,
      win_rate: 0,
      best_trade: 0,
      worst_trade: 0,
      total_trades: 0,
      equity_curve: [],
      trades: [],
    })
  }

  // Calculate total whale buy volume for proportional sizing
  const totalWhaleBuyVolume = trades
    .filter(t => t.classification === 'BUY')
    .reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)

  if (totalWhaleBuyVolume === 0) {
    return NextResponse.json({
      total_pnl: 0,
      pnl_pct: 0,
      win_rate: 0,
      best_trade: 0,
      worst_trade: 0,
      total_trades: trades.length,
      equity_curve: [],
      trades: trades.map(t => ({
        token: t.token_symbol,
        action: t.classification,
        usd_value: Number(t.usd_value) || 0,
        timestamp: t.timestamp,
      })),
    })
  }

  // Simulate portfolio
  // For each BUY: allocate proportional capital based on trade size vs total buy volume
  // For each SELL: realize the position proportionally
  let cash = startingCapital
  const positions = {} // token -> { cost_basis, units (proportional), total_invested }
  const closedTrades = [] // { token, pnl }
  const equityByDay = {} // dateStr -> portfolio value

  for (const trade of trades) {
    const sym = trade.token_symbol || 'UNKNOWN'
    const val = Number(trade.usd_value) || 0
    if (val <= 0) continue

    // Proportional allocation: what fraction of the whale's total buy activity is this trade?
    const proportion = val / totalWhaleBuyVolume

    if (trade.classification === 'BUY') {
      // Allocate proportional amount of starting capital
      const allocation = startingCapital * proportion
      const spend = Math.min(allocation, cash)
      if (spend <= 0) continue

      cash -= spend
      if (!positions[sym]) {
        positions[sym] = { cost_basis: 0, current_value: 0, total_invested: 0 }
      }
      positions[sym].cost_basis += spend
      positions[sym].current_value += spend // starts at cost
      positions[sym].total_invested += spend
    } else if (trade.classification === 'SELL') {
      if (!positions[sym] || positions[sym].cost_basis <= 0) continue

      // The whale sold some of this token. Calculate the price change implied
      // by comparing whale's sell value to their buy value for proportional position.
      // We use the ratio of sell value to buy value to estimate return.
      const pos = positions[sym]

      // Calculate how much of the position to sell (proportional to whale's sell vs their buys)
      const whaleTokenBuys = trades
        .filter(t => t.token_symbol === sym && t.classification === 'BUY')
        .reduce((s, t) => s + (Number(t.usd_value) || 0), 0)

      if (whaleTokenBuys <= 0) continue

      const sellRatio = Math.min(1, val / whaleTokenBuys)
      const costPortion = pos.cost_basis * sellRatio

      // The whale's return on this token: sell value / buy value
      const whaleReturn = val / (whaleTokenBuys * sellRatio)
      const proceeds = costPortion * whaleReturn

      const pnl = proceeds - costPortion
      cash += proceeds
      pos.cost_basis -= costPortion
      pos.current_value -= costPortion

      closedTrades.push({ token: sym, pnl })
    }

    // Record daily equity snapshot
    const day = trade.timestamp ? trade.timestamp.slice(0, 10) : null
    if (day) {
      const openPositionValue = Object.values(positions).reduce(
        (sum, p) => sum + Math.max(0, p.cost_basis),
        0
      )
      equityByDay[day] = cash + openPositionValue
    }
  }

  // Build equity curve with one point per day
  const dayKeys = Object.keys(equityByDay).sort()
  const equity_curve = dayKeys.map(d => ({ date: d, value: Math.round(equityByDay[d] * 100) / 100 }))

  // If we have open positions at the end, add their cost basis as current value
  const finalOpenValue = Object.values(positions).reduce(
    (sum, p) => sum + Math.max(0, p.cost_basis),
    0
  )
  const finalPortfolioValue = cash + finalOpenValue

  const total_pnl = Math.round((finalPortfolioValue - startingCapital) * 100) / 100
  const pnl_pct = Math.round((total_pnl / startingCapital) * 10000) / 100

  const wins = closedTrades.filter(t => t.pnl > 0).length
  const win_rate = closedTrades.length > 0
    ? Math.round((wins / closedTrades.length) * 10000) / 100
    : 0

  const pnls = closedTrades.map(t => t.pnl)
  const best_trade = pnls.length > 0 ? Math.round(Math.max(...pnls) * 100) / 100 : 0
  const worst_trade = pnls.length > 0 ? Math.round(Math.min(...pnls) * 100) / 100 : 0

  const tradeLog = trades.slice(0, 200).map(t => ({
    token: t.token_symbol,
    action: t.classification,
    usd_value: Number(t.usd_value) || 0,
    timestamp: t.timestamp,
  }))

  return NextResponse.json(
    {
      total_pnl,
      pnl_pct,
      win_rate,
      best_trade,
      worst_trade,
      total_trades: trades.length,
      equity_curve,
      trades: tradeLog,
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
