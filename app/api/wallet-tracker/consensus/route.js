import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const hours = Math.min(parseInt(searchParams.get('hours') || '24', 10), 168)
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // Get smart money wallets (score >= 0.4)
  const { data: smartWallets } = await supabaseAdmin
    .from('wallet_profiles')
    .select('address')
    .gte('smart_money_score', 0.4)
    .gte('tx_count_30d', 10)
    .limit(200)

  if (!smartWallets || smartWallets.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const smartAddrs = smartWallets.map(w => w.address)

  // Get recent trades from smart money
  const { data: txs, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value')
    .in('whale_address', smartAddrs)
    .gte('timestamp', since)
    .in('classification', ['BUY', 'SELL'])
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate per token
  const tokenMap = new Map()
  for (const tx of txs || []) {
    const sym = tx.token_symbol
    if (!sym) continue
    const entry = tokenMap.get(sym) || {
      token: sym,
      buy_wallets: new Set(),
      sell_wallets: new Set(),
      buy_volume: 0,
      sell_volume: 0,
      buy_count: 0,
      sell_count: 0,
    }
    const val = Number(tx.usd_value) || 0
    if (tx.classification === 'BUY') {
      entry.buy_wallets.add(tx.whale_address)
      entry.buy_volume += val
      entry.buy_count += 1
    } else {
      entry.sell_wallets.add(tx.whale_address)
      entry.sell_volume += val
      entry.sell_count += 1
    }
    tokenMap.set(sym, entry)
  }

  // Build consensus data
  const data = Array.from(tokenMap.values())
    .filter(t => t.buy_wallets.size + t.sell_wallets.size >= 2)
    .map(t => {
      const totalWallets = new Set([...t.buy_wallets, ...t.sell_wallets]).size
      const buyPct = t.buy_wallets.size / totalWallets
      let sentiment = 'neutral'
      if (buyPct >= 0.7) sentiment = 'accumulating'
      else if (buyPct <= 0.3) sentiment = 'distributing'
      else sentiment = 'mixed'

      return {
        token: t.token,
        sentiment,
        buy_wallets: t.buy_wallets.size,
        sell_wallets: t.sell_wallets.size,
        total_wallets: totalWallets,
        buy_volume: t.buy_volume,
        sell_volume: t.sell_volume,
        net_flow: t.buy_volume - t.sell_volume,
        buy_pct: Math.round(buyPct * 100),
      }
    })
    .sort((a, b) => b.total_wallets - a.total_wallets)
    .slice(0, 20)

  return NextResponse.json(
    { data, smart_wallet_count: smartAddrs.length, hours },
    { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
  )
}
