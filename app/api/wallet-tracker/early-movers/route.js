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
  const limitRaw = parseInt(searchParams.get('limit') || '10', 10)
  const limit = Math.min(Math.max(1, limitRaw), 30)

  // Strategy: find tokens with high recent volume, then find who bought early
  const now = Date.now()
  const recentWindow = new Date(now - 24 * 60 * 60 * 1000).toISOString() // last 24h
  const earlyWindow = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() // last 7d

  // Get tokens with high recent buy activity (last 24h)
  const { data: recentBuys, error: err1 } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, usd_value')
    .eq('classification', 'BUY')
    .gte('timestamp', recentWindow)
    .limit(2000)

  if (err1) {
    return NextResponse.json({ error: err1.message }, { status: 500 })
  }

  // Aggregate recent volume per token
  const tokenVolume = new Map()
  for (const tx of recentBuys || []) {
    if (!tx.token_symbol) continue
    tokenVolume.set(tx.token_symbol, (tokenVolume.get(tx.token_symbol) || 0) + (Number(tx.usd_value) || 0))
  }

  // Get top tokens by recent buy volume
  const hotTokens = Array.from(tokenVolume.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([symbol]) => symbol)

  if (hotTokens.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // For each hot token, find who bought earliest (3-7 days ago, before the recent spike)
  const earlyBuyWindow = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const beforeSpike = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() // bought at least 2 days ago

  const { data: earlyTxs, error: err2 } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, usd_value, timestamp, blockchain')
    .eq('classification', 'BUY')
    .in('token_symbol', hotTokens)
    .gte('timestamp', earlyBuyWindow)
    .lte('timestamp', beforeSpike)
    .order('timestamp', { ascending: true })
    .limit(2000)

  if (err2) {
    return NextResponse.json({ error: err2.message }, { status: 500 })
  }

  // Group early buyers per token
  const earlyMovers = new Map()
  for (const tx of earlyTxs || []) {
    const key = `${tx.token_symbol}|${tx.whale_address}`
    if (!earlyMovers.has(key)) {
      earlyMovers.set(key, {
        address: tx.whale_address,
        token: tx.token_symbol,
        chain: tx.blockchain,
        first_buy: tx.timestamp,
        total_invested: 0,
        buy_count: 0,
      })
    }
    const mover = earlyMovers.get(key)
    mover.total_invested += Number(tx.usd_value) || 0
    mover.buy_count += 1
  }

  // Score: how early + how much they invested
  const results = Array.from(earlyMovers.values())
    .filter(m => m.buy_count >= 1 && m.total_invested > 1000)
    .map(m => {
      const daysEarly = (now - new Date(m.first_buy).getTime()) / (24 * 60 * 60 * 1000)
      const recentVol = tokenVolume.get(m.token) || 0
      return {
        ...m,
        days_early: Math.round(daysEarly * 10) / 10,
        token_recent_volume: recentVol,
      }
    })
    .sort((a, b) => b.token_recent_volume - a.token_recent_volume || b.days_early - a.days_early)

  // Deduplicate: one entry per wallet, keep the best token
  const seen = new Set()
  const deduped = []
  for (const r of results) {
    if (!seen.has(r.address)) {
      seen.add(r.address)
      deduped.push(r)
    }
    if (deduped.length >= limit) break
  }

  // Enrich with entity names
  const addrs = deduped.map(d => d.address)
  if (addrs.length > 0) {
    const { data: labels } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', addrs)
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')

    const { data: profiles } = await supabaseAdmin
      .from('wallet_profiles')
      .select('address, entity_name, smart_money_score')
      .in('address', addrs)

    const labelMap = new Map()
    for (const l of labels || []) {
      if (!labelMap.has(l.address)) labelMap.set(l.address, l.entity_name)
    }
    const scoreMap = new Map()
    for (const p of profiles || []) {
      if (p.entity_name && !labelMap.has(p.address)) labelMap.set(p.address, p.entity_name)
      if (p.smart_money_score) scoreMap.set(p.address, p.smart_money_score)
    }

    for (const d of deduped) {
      d.entity_name = labelMap.get(d.address) || null
      d.smart_money_score = scoreMap.get(d.address) || null
    }
  }

  return NextResponse.json(
    { data: deduped },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
  )
}
