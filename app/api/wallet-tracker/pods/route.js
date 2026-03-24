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
  const limit = Math.min(Math.max(1, limitRaw), 20)

  // Get recent transactions from the last 7 days grouped by token + classification + hour
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: txs, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, timestamp, usd_value')
    .gte('timestamp', since)
    .in('classification', ['BUY', 'SELL'])
    .order('timestamp', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group transactions into time windows (4-hour blocks) per token + action
  const windowMs = 4 * 60 * 60 * 1000
  const windowMap = new Map() // key: "token|action|windowId" -> set of addresses

  for (const tx of txs || []) {
    const ts = new Date(tx.timestamp).getTime()
    const windowId = Math.floor(ts / windowMs)
    const key = `${tx.token_symbol}|${tx.classification}|${windowId}`

    if (!windowMap.has(key)) {
      windowMap.set(key, {
        token: tx.token_symbol,
        action: tx.classification,
        window_start: new Date(windowId * windowMs).toISOString(),
        wallets: new Map(),
      })
    }

    const group = windowMap.get(key)
    const existing = group.wallets.get(tx.whale_address) || { address: tx.whale_address, volume: 0, count: 0 }
    existing.volume += Number(tx.usd_value) || 0
    existing.count += 1
    group.wallets.set(tx.whale_address, existing)
  }

  // Find pods: windows where 3+ wallets did the same thing
  const pods = []
  for (const [, group] of windowMap) {
    if (group.wallets.size >= 3) {
      const wallets = Array.from(group.wallets.values())
        .sort((a, b) => b.volume - a.volume)
      const totalVolume = wallets.reduce((s, w) => s + w.volume, 0)

      pods.push({
        token: group.token,
        action: group.action,
        window_start: group.window_start,
        wallet_count: wallets.length,
        total_volume: totalVolume,
        wallets: wallets.slice(0, 5), // top 5 by volume
      })
    }
  }

  // Sort by wallet count * volume (most significant pods first)
  pods.sort((a, b) => (b.wallet_count * b.total_volume) - (a.wallet_count * a.total_volume))

  // Enrich wallet addresses with entity names
  const allAddrs = [...new Set(pods.flatMap(p => p.wallets.map(w => w.address)))]
  let labelMap = new Map()
  if (allAddrs.length > 0) {
    const { data: labels } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', allAddrs.slice(0, 100))
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')

    if (labels) {
      for (const l of labels) {
        if (!labelMap.has(l.address) || l.entity_name.length > labelMap.get(l.address).length) {
          labelMap.set(l.address, l.entity_name)
        }
      }
    }

    // Also check wallet_profiles for entity names
    const { data: profiles } = await supabaseAdmin
      .from('wallet_profiles')
      .select('address, entity_name')
      .in('address', allAddrs.slice(0, 100))
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')

    if (profiles) {
      for (const p of profiles) {
        if (!labelMap.has(p.address)) {
          labelMap.set(p.address, p.entity_name)
        }
      }
    }
  }

  // Apply labels
  for (const pod of pods) {
    for (const w of pod.wallets) {
      w.entity_name = labelMap.get(w.address) || null
    }
  }

  return NextResponse.json(
    { data: pods.slice(0, limit) },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
  )
}
