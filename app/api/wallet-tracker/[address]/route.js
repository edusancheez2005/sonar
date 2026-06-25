import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

// EVM: 0x + 40 hex, Solana: base58 32-44 chars, Bitcoin: 26-62 alphanumeric
const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,61}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

export async function GET(req, { params }) {
  const ip = getClientIp(req)
  const rl = rateLimit(`wallet-address:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { address } = await params
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 })
  }
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || null

  let query = supabaseAdmin
    .from('wallet_profiles')
    .select('*')
    .eq('address', address)

  if (chain) {
    query = query.eq('chain', chain)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data) {
    // Enrich with entity label if missing
    if (!data.entity_name) {
      const { data: labels } = await supabaseAdmin
        .from('addresses')
        .select('entity_name')
        .eq('address', address)
        .not('entity_name', 'is', null)
        .not('entity_name', 'eq', '')
        .limit(1)
      if (labels && labels.length > 0) {
        data.entity_name = labels[0].entity_name
      }
    }
    // Arkham fallback (tracked_address_universe). Pure DB lookup.
    if (!data.entity_name) {
      const { fetchArkhamLabels, formatArkhamDisplayName } = await import('@/lib/arkham/address-lookup')
      const arkMap = await fetchArkhamLabels([address])
      const rec = arkMap.get(address) || arkMap.get(String(address).toLowerCase())
      const name = formatArkhamDisplayName(rec)
      if (name) {
        data.entity_name = name
        if (rec?.entity_type) data.arkham_entity_type = rec.entity_type
        if (rec?.entity_id)   data.arkham_entity_id   = rec.entity_id
      }
    }
    // Freshen volatile stats from the LIVE tape. wallet_profiles is only
    // re-aggregated by an hourly cron that can't keep all 42k rows current,
    // so the stored last_active / 30d volume / tx counts can lag by days.
    // The viewed wallet must always show up-to-date numbers.
    try {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data: liveTx } = await supabaseAdmin
        .from('all_whale_transactions')
        .select('usd_value, timestamp')
        .eq('whale_address', address)
        .order('timestamp', { ascending: false })
        .limit(5000)
      if (Array.isArray(liveTx) && liveTx.length > 0) {
        let vol30 = 0
        let tx30 = 0
        for (const t of liveTx) {
          if (t.timestamp >= since30) {
            vol30 += Number(t.usd_value) || 0
            tx30 += 1
          }
        }
        data.last_active = liveTx[0].timestamp
        data.total_volume_usd_30d = Math.round(vol30 * 100) / 100
        data.tx_count_30d = tx30
      }
    } catch {
      // Non-fatal — fall back to the stored (possibly stale) values.
    }
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  }

  // Fallback: aggregate from all_whale_transactions
  const { data: txData, error: txError } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('blockchain, token_symbol, usd_value, classification, timestamp')
    .eq('whale_address', address)
    .order('timestamp', { ascending: false })
    .limit(2000)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  if (!txData || txData.length === 0) {
    // Polymarket fallback. Polymarket proxy wallets trade prediction markets
    // on Polygon and never land in all_whale_transactions/wallet_profiles, so
    // the generic page would dead-end on "No tracked data". We already sync
    // their positions + trade tape, so surface that instead.
    const pmProfile = await buildPolymarketProfile(supabaseAdmin, address)
    if (pmProfile) {
      return NextResponse.json(
        { data: pmProfile },
        { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
      )
    }
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  // Compute portfolio value from net flow per token
  const tokenFlows = new Map()
  let totalVolume = 0
  const chains = new Set()
  const lastActive = txData[0]?.timestamp || null

  for (const tx of txData) {
    const val = Number(tx.usd_value) || 0
    totalVolume += val
    if (tx.blockchain) chains.add(tx.blockchain)
    const sym = tx.token_symbol
    if (!sym) continue
    if (!tokenFlows.has(sym)) tokenFlows.set(sym, { buy: 0, sell: 0 })
    const entry = tokenFlows.get(sym)
    const cls = (tx.classification || '').toUpperCase()
    if (cls === 'BUY') entry.buy += val
    else if (cls === 'SELL') entry.sell += val
  }

  let portfolioValue = 0
  for (const [, flows] of tokenFlows) {
    const net = flows.buy - flows.sell
    if (net > 0) portfolioValue += net
  }

  return NextResponse.json(
    {
      data: {
        address,
        chains: [...chains],
        total_volume_usd_30d: totalVolume,
        portfolio_value_usd: Math.round(portfolioValue * 100) / 100,
        tx_count: txData.length,
        last_active: lastActive,
        source: 'aggregated',
      },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}

// Build a wallet profile from the Polymarket tables we already sync
// (polymarket_whales = aggregated positions, polymarket_activity = trade tape).
// Returns null when the address has no Polymarket footprint.
async function buildPolymarketProfile(supabaseAdmin, address) {
  const lower = String(address).toLowerCase()
  const [{ data: whale }, { data: trades }] = await Promise.all([
    supabaseAdmin
      .from('polymarket_whales')
      .select('proxy_wallet, name, profile_image, total_value_usd, total_amount, markets_count, positions, arkham_entity, updated_at')
      .eq('proxy_wallet', lower)
      .maybeSingle(),
    supabaseAdmin
      .from('polymarket_activity')
      .select('tx_hash, condition_id, side, outcome, usd_value, price, size, ts, name, entity_name')
      .eq('proxy_wallet', lower)
      .order('ts', { ascending: false })
      .limit(50),
  ])

  const tradeRows = trades || []
  if (!whale && tradeRows.length === 0) return null

  const positions = Array.isArray(whale?.positions) ? whale.positions : []
  const pnl = positions.reduce((sum, p) => sum + (Number(p?.pnl_usd) || 0), 0)
  const tradeVolume = tradeRows.reduce((sum, t) => sum + (Number(t?.usd_value) || 0), 0)
  const displayName =
    whale?.name ||
    whale?.arkham_entity ||
    tradeRows.find((t) => t.entity_name)?.entity_name ||
    tradeRows.find((t) => t.name)?.name ||
    null

  return {
    address,
    chains: ['polygon'],
    chain: 'polygon',
    entity_name: displayName,
    portfolio_value_usd: whale?.total_value_usd != null ? Number(whale.total_value_usd) : null,
    pnl_estimated_usd: positions.length > 0 ? Math.round(pnl * 100) / 100 : null,
    total_volume_usd_30d: tradeVolume || null,
    tx_count: tradeRows.length,
    last_active: tradeRows[0]?.ts || whale?.updated_at || null,
    source: 'polymarket',
    polymarket: {
      name: whale?.name || displayName,
      profile_image: whale?.profile_image || null,
      total_value_usd: whale?.total_value_usd != null ? Number(whale.total_value_usd) : null,
      markets_count: whale?.markets_count ?? positions.length,
      pnl_usd: positions.length > 0 ? Math.round(pnl * 100) / 100 : null,
      positions: positions
        .map((p) => ({
          market_question: p?.market_question || null,
          outcome: p?.outcome || null,
          size: Number(p?.size) || 0,
          avg_price: p?.avg_price != null ? Number(p.avg_price) : null,
          cur_price: p?.cur_price != null ? Number(p.cur_price) : null,
          value_usd: Number(p?.value_usd) || 0,
          pnl_usd: Number(p?.pnl_usd) || 0,
        }))
        .sort((a, b) => b.value_usd - a.value_usd),
      recent_trades: tradeRows.map((t) => ({
        tx_hash: t.tx_hash,
        side: t.side,
        outcome: t.outcome,
        usd_value: Number(t.usd_value) || 0,
        price: t.price != null ? Number(t.price) : null,
        size: Number(t.size) || 0,
        ts: t.ts,
      })),
    },
  }
}
