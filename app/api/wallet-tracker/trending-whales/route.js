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
  const tokensParam = searchParams.get('tokens')

  if (!tokensParam) {
    return NextResponse.json({ error: 'Missing tokens param' }, { status: 400 })
  }

  const tokens = tokensParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50)

  if (tokens.length === 0) {
    return NextResponse.json({ error: 'No valid tokens provided' }, { status: 400 })
  }

  try {
    // Get smart money wallets (score >= 0.4)
    const { data: smartWallets, error: walletErr } = await supabaseAdmin
      .from('wallet_profiles')
      .select('address, entity_name, smart_money_score')
      .gte('smart_money_score', 0.4)
      .order('smart_money_score', { ascending: false })
      .limit(200)

    if (walletErr) {
      return NextResponse.json({ error: walletErr.message }, { status: 500 })
    }

    if (!smartWallets || smartWallets.length === 0) {
      const empty = tokens.map(token => ({
        token,
        buy_count: 0,
        sell_count: 0,
        buy_volume: 0,
        sell_volume: 0,
        net_flow: 0,
        top_buyers: [],
      }))
      return NextResponse.json({ data: empty })
    }

    const addrList = smartWallets.map(w => w.address)
    const walletMap = new Map(smartWallets.map(w => [w.address, w]))

    // Query recent (24h) BUY/SELL activity on the requested tokens
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: txs, error: txErr } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('whale_address, token_symbol, classification, usd_value, timestamp')
      .in('whale_address', addrList)
      .in('classification', ['BUY', 'SELL'])
      .in('token_symbol', tokens)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(2000)

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 })
    }

    // Aggregate per token
    const tokenStats = new Map()
    for (const token of tokens) {
      tokenStats.set(token, {
        token,
        buy_count: 0,
        sell_count: 0,
        buy_volume: 0,
        sell_volume: 0,
        net_flow: 0,
        buyers: new Map(), // address -> volume
      })
    }

    for (const tx of txs || []) {
      const sym = (tx.token_symbol || '').toUpperCase()
      const stat = tokenStats.get(sym)
      if (!stat) continue

      const vol = Number(tx.usd_value) || 0
      if (tx.classification === 'BUY') {
        stat.buy_count++
        stat.buy_volume += vol
        stat.net_flow += vol
        const prev = stat.buyers.get(tx.whale_address) || 0
        stat.buyers.set(tx.whale_address, prev + vol)
      } else if (tx.classification === 'SELL') {
        stat.sell_count++
        stat.sell_volume += vol
        stat.net_flow -= vol
      }
    }

    // Build response
    const data = tokens.map(token => {
      const stat = tokenStats.get(token)
      // Sort buyers by volume desc, take top 3
      const topBuyers = [...stat.buyers.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([address, volume]) => {
          const wallet = walletMap.get(address)
          return {
            address,
            entity_name: wallet?.entity_name || null,
            volume,
          }
        })

      return {
        token: stat.token,
        buy_count: stat.buy_count,
        sell_count: stat.sell_count,
        buy_volume: stat.buy_volume,
        sell_volume: stat.sell_volume,
        net_flow: stat.net_flow,
        top_buyers: topBuyers,
      }
    })

    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('trending-whales error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
