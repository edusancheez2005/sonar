import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

function inListLiteral(values) {
  // Quote any value containing characters that would break the `in.(...)` grammar
  // (commas, parens, spaces). PostgREST treats each value as-is.
  return `(${values
    .map((v) => {
      const s = String(v)
      if (/[,()\s"]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`
      return s
    })
    .join(',')})`
}

async function aggregateFollowedLabels(labels) {
  if (!labels || labels.length === 0) return []

  // Pull recent rows touching any of the followed labels. Scoped to a bounded
  // window so one user's watchlist can't fan out into a 20k-row scan.
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('from_label, to_label, usd_value, blockchain, timestamp')
    .or(
      `from_label.in.${inListLiteral(labels)},to_label.in.${inListLiteral(labels)}`
    )
    .order('timestamp', { ascending: false })
    .limit(5000)

  if (error) {
    return labels.map((name) => ({
      entity_name: name,
      tx_count: 0,
      total_volume: 0,
      last_active: null,
      chain_count: 0,
    }))
  }

  const followedSet = new Set(labels)
  const map = new Map()
  for (const label of labels) {
    map.set(label, {
      entity_name: label,
      tx_count: 0,
      total_volume: 0,
      last_active: null,
      chains: new Set(),
    })
  }
  for (const r of data || []) {
    const name = followedSet.has(r.from_label)
      ? r.from_label
      : followedSet.has(r.to_label)
      ? r.to_label
      : null
    if (!name) continue
    const rec = map.get(name)
    rec.tx_count += 1
    rec.total_volume += Number(r.usd_value || 0)
    if (r.blockchain) rec.chains.add(String(r.blockchain).toLowerCase())
    if (!rec.last_active || new Date(r.timestamp) > new Date(rec.last_active)) {
      rec.last_active = r.timestamp
    }
  }
  return Array.from(map.values()).map((e) => ({
    entity_name: e.entity_name,
    tx_count: e.tx_count,
    total_volume: e.total_volume,
    last_active: e.last_active,
    chain_count: e.chains.size,
  }))
}

export async function GET(req) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [entityWatch, walletFollows] = await Promise.all([
    supabaseAdmin
      .from('entity_watchlist')
      .select('entity_type, entity_ref, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('wallet_follows')
      .select('address, followed_at, nickname')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false }),
  ])

  if (entityWatch.error) {
    return NextResponse.json({ error: entityWatch.error.message }, { status: 500 })
  }
  if (walletFollows.error) {
    return NextResponse.json({ error: walletFollows.error.message }, { status: 500 })
  }

  const rawFollows = entityWatch.data || []
  const curatedRefs = rawFollows
    .filter((r) => r.entity_type === 'curated')
    .map((r) => r.entity_ref)
  const labelRefs = rawFollows
    .filter((r) => r.entity_type === 'label')
    .map((r) => r.entity_ref)

  // Hydrate curated figures
  let figures = []
  if (curatedRefs.length > 0) {
    const { data: curated } = await supabaseAdmin
      .from('curated_entities')
      .select('slug, display_name, description, category, avatar_url, twitter_handle, addresses')
      .in('slug', curatedRefs)
    const curatedMap = Object.fromEntries((curated || []).map((c) => [c.slug, c]))
    // Preserve watchlist order (most recently followed first)
    figures = curatedRefs
      .map((slug) => curatedMap[slug])
      .filter(Boolean)
  }

  // Aggregate stats for labeled entities
  const entities = await aggregateFollowedLabels(labelRefs)
  // Keep watchlist order (recent first)
  const entityOrder = new Map(labelRefs.map((name, i) => [name, i]))
  entities.sort(
    (a, b) =>
      (entityOrder.get(a.entity_name) ?? 0) -
      (entityOrder.get(b.entity_name) ?? 0)
  )

  // Hydrate wallets: label from addresses, last_active from wallet_profiles
  const walletRows = walletFollows.data || []
  let wallets = []
  if (walletRows.length > 0) {
    const addrs = walletRows.map((w) => w.address)
    const [{ data: addrLabels }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from('addresses')
        .select('address, entity_name, label')
        .in('address', addrs),
      supabaseAdmin
        .from('wallet_profiles')
        .select('address, last_active, chain, entity_name')
        .in('address', addrs),
    ])
    const labelMap = new Map(
      (addrLabels || []).map((r) => [r.address, r.entity_name || r.label || null])
    )
    const profileMap = new Map((profiles || []).map((r) => [r.address, r]))
    wallets = walletRows.map((w) => {
      const p = profileMap.get(w.address) || null
      const label = w.nickname || labelMap.get(w.address) || p?.entity_name || null
      return {
        address: w.address,
        followed_at: w.followed_at,
        label,
        last_active: p?.last_active || null,
        chain: p?.chain || null,
      }
    })
  }

  return NextResponse.json(
    { figures, entities, wallets },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
