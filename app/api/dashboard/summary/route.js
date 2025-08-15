import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash, timestamp, token_symbol, classification, blockchain, usd_value, from_address')
    .not('token_symbol', 'is', null)
    .not('token_symbol', 'ilike', 'unknown%')
    .not('classification', 'ilike', 'transfer')
    .order('timestamp', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recent = (data || []).map((t) => ({
    transaction_hash: t.transaction_hash,
    time: t.timestamp,
    coin: t.token_symbol,
    action: (t.classification || '').toUpperCase(),
    blockchain: t.blockchain,
    usd_value: Number(t.usd_value || 0),
    from_address: t.from_address || null,
  }))

  // Get data from last 24 hours only for buy/sell percentages
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: aggData } = await supabaseAdmin
    .from('whale_transactions')
    .select('token_symbol, classification, usd_value, blockchain')
    .not('token_symbol', 'is', null)
    .not('token_symbol', 'ilike', 'unknown%')
    .gte('timestamp', since24h)
    .order('timestamp', { ascending: false })

  const byCoin = new Map()
  const byCoinBuyCounts = new Map()
  const byCoinSellCounts = new Map()
  const byChain = new Map()

  for (const row of aggData || []) {
    const coin = row.token_symbol || '—'
    const chain = row.blockchain || '—'
    byChain.set(chain, (byChain.get(chain) || 0) + 1)

    const klass = (row.classification || '').toLowerCase()
    if (klass === 'buy') byCoinBuyCounts.set(coin, (byCoinBuyCounts.get(coin) || 0) + 1)
    else if (klass === 'sell') byCoinSellCounts.set(coin, (byCoinSellCounts.get(coin) || 0) + 1)
    byCoin.set(coin, (byCoin.get(coin) || 0) + 1)
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

  return NextResponse.json({ recent, topBuys, topSells, blockchainVolume })
} 