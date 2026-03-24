import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD']

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const hoursRaw = parseInt(searchParams.get('hours') || '24', 10)
  const hours = Math.min(Math.max(1, hoursRaw), 168)

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data: txs, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value')
    .gte('timestamp', since)
    .in('classification', ['BUY', 'SELL'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by token_symbol
  const tokenMap = new Map()

  for (const tx of (txs || [])) {
    const sym = tx.token_symbol
    if (!sym || STABLECOINS.includes(sym.toUpperCase())) continue

    if (!tokenMap.has(sym)) {
      tokenMap.set(sym, {
        token_symbol: sym,
        buy_volume: 0,
        sell_volume: 0,
        total_volume: 0,
        buy_count: 0,
        sell_count: 0,
        wallets: new Set(),
        net_flow: 0,
      })
    }

    const entry = tokenMap.get(sym)
    const val = Number(tx.usd_value) || 0

    if (tx.classification === 'BUY') {
      entry.buy_volume += val
      entry.buy_count += 1
    } else {
      entry.sell_volume += val
      entry.sell_count += 1
    }

    entry.total_volume += val
    entry.wallets.add(tx.whale_address)
  }

  // Convert to array, compute derived fields, sort and limit
  const tokens = Array.from(tokenMap.values())
    .map(t => {
      const net_flow = t.buy_volume - t.sell_volume
      let sentiment = 'neutral'
      if (t.buy_volume > t.sell_volume * 1.2) sentiment = 'bullish'
      else if (t.sell_volume > t.buy_volume * 1.2) sentiment = 'bearish'

      return {
        token_symbol: t.token_symbol,
        buy_volume: t.buy_volume,
        sell_volume: t.sell_volume,
        total_volume: t.total_volume,
        buy_count: t.buy_count,
        sell_count: t.sell_count,
        unique_wallets: t.wallets.size,
        net_flow,
        sentiment,
      }
    })
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 30)

  return NextResponse.json(
    { data: tokens, hours },
    { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
  )
}
