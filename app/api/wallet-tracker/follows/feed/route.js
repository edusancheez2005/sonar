import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get followed addresses
  const { data: follows } = await supabaseAdmin
    .from('wallet_follows')
    .select('address, nickname')
    .eq('user_id', user.id)

  if (!follows || follows.length === 0) {
    return NextResponse.json({ data: [], wallets: [] })
  }

  const addresses = follows.map(f => f.address)
  const nicknameMap = new Map(follows.map(f => [f.address, f.nickname]))

  // Get wallet profiles for cards
  const { data: profiles } = await supabaseAdmin
    .from('wallet_profiles')
    .select('address, entity_name, smart_money_score, tags, total_volume_usd_30d, last_active, chain')
    .in('address', addresses)

  // Enrich with entity labels
  const unlabeled = (profiles || []).filter(p => !p.entity_name).map(p => p.address)
  const labelMap = new Map()
  if (unlabeled.length > 0) {
    const { data: labels } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', unlabeled)
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')
    for (const l of labels || []) {
      if (!labelMap.has(l.address)) labelMap.set(l.address, l.entity_name)
    }
  }

  const profileMap = new Map()
  for (const p of profiles || []) {
    if (!p.entity_name && labelMap.has(p.address)) p.entity_name = labelMap.get(p.address)
    profileMap.set(p.address, p)
  }

  // Build wallet cards (include addresses without profiles too)
  const wallets = addresses.map(addr => {
    const p = profileMap.get(addr)
    return {
      address: addr,
      nickname: nicknameMap.get(addr) || null,
      entity_name: p?.entity_name || labelMap.get(addr) || null,
      smart_money_score: p?.smart_money_score || null,
      tags: p?.tags || [],
      total_volume_usd_30d: p?.total_volume_usd_30d || null,
      last_active: p?.last_active || null,
      chain: p?.chain || null,
    }
  })

  // Get recent transactions for followed wallets
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)

  const { data: txs } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, blockchain, timestamp, transaction_hash')
    .in('whale_address', addresses)
    .in('classification', ['BUY', 'SELL'])
    .order('timestamp', { ascending: false })
    .limit(limit)

  // Enrich transactions with wallet info
  const feed = (txs || []).map(tx => ({
    ...tx,
    entity_name: profileMap.get(tx.whale_address)?.entity_name || labelMap.get(tx.whale_address) || null,
    smart_money_score: profileMap.get(tx.whale_address)?.smart_money_score || null,
  }))

  // Get sparkline data for each wallet (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sparkTxs } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, timestamp, usd_value')
    .in('whale_address', addresses)
    .gte('timestamp', sevenDaysAgo)

  const sparklines = {}
  const now = Date.now()
  for (const addr of addresses) {
    sparklines[addr] = [0, 0, 0, 0, 0, 0, 0]
  }
  for (const tx of sparkTxs || []) {
    if (!sparklines[tx.whale_address]) continue
    const daysAgo = Math.floor((now - new Date(tx.timestamp).getTime()) / (24 * 60 * 60 * 1000))
    const idx = 6 - Math.min(daysAgo, 6)
    sparklines[tx.whale_address][idx] += Math.abs(Number(tx.usd_value) || 0)
  }

  // Get last trade per wallet
  const lastTrades = {}
  for (const tx of txs || []) {
    if (!lastTrades[tx.whale_address]) {
      lastTrades[tx.whale_address] = {
        token: tx.token_symbol,
        action: tx.classification,
        usd_value: tx.usd_value,
        timestamp: tx.timestamp,
      }
    }
  }

  // Attach sparklines and last trade to wallet cards
  for (const w of wallets) {
    w.sparkline = sparklines[w.address] || [0, 0, 0, 0, 0, 0, 0]
    w.last_trade = lastTrades[w.address] || null
  }

  return NextResponse.json({ wallets, feed })
}
