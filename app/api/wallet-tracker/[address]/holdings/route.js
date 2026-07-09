import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req, { params }) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { address } = await params

  // Preferred: exact server-side aggregation (no 1,000-row PostgREST cap that
  // truncated the per-token buy/sell volumes and counts for active wallets).
  try {
    const { data: aggRows, error: rpcErr } = await supabaseAdmin.rpc('wallet_token_holdings_agg', {
      p_address: address,
    })
    if (!rpcErr && Array.isArray(aggRows)) {
      const holdings = aggRows.map((h) => {
        const buy_volume = Number(h.buy_volume) || 0
        const sell_volume = Number(h.sell_volume) || 0
        const buy_count = Number(h.buy_count) || 0
        const sell_count = Number(h.sell_count) || 0
        return {
          symbol: h.symbol,
          chain: h.chain,
          buy_volume,
          sell_volume,
          buy_count,
          sell_count,
          net_flow: buy_volume - sell_volume,
          total_volume: buy_volume + sell_volume,
          tx_count: buy_count + sell_count,
        }
      })
      return NextResponse.json(
        { data: holdings },
        { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
      )
    }
  } catch {
    // fall through to the legacy (capped) row scan
  }

  const { data: txData, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, classification, usd_value, blockchain')
    .eq('whale_address', address)
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate per token: net exposure = buys - sells
  const tokenMap = new Map()
  for (const tx of txData || []) {
    const sym = tx.token_symbol
    if (!sym) continue
    const entry = tokenMap.get(sym) || {
      symbol: sym,
      chain: tx.blockchain,
      buy_volume: 0,
      sell_volume: 0,
      buy_count: 0,
      sell_count: 0,
    }
    const val = Number(tx.usd_value) || 0
    const cls = (tx.classification || '').toUpperCase()
    if (cls === 'BUY') {
      entry.buy_volume += val
      entry.buy_count += 1
    } else if (cls === 'SELL') {
      entry.sell_volume += val
      entry.sell_count += 1
    }
    tokenMap.set(sym, entry)
  }

  const holdings = Array.from(tokenMap.values())
    .map(h => ({
      ...h,
      net_flow: h.buy_volume - h.sell_volume,
      total_volume: h.buy_volume + h.sell_volume,
      tx_count: h.buy_count + h.sell_count,
    }))
    .sort((a, b) => b.total_volume - a.total_volume)

  return NextResponse.json(
    { data: holdings },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
