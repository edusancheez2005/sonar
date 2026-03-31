import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
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
    .limit(200)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  if (!txData || txData.length === 0) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const totalVolume = txData.reduce((sum, tx) => sum + (Number(tx.usd_value) || 0), 0)
  const chains = [...new Set(txData.map(tx => tx.blockchain).filter(Boolean))]
  const lastActive = txData[0]?.timestamp || null

  return NextResponse.json(
    {
      data: {
        address,
        chains,
        total_volume_usd_30d: totalVolume,
        tx_count: txData.length,
        last_active: lastActive,
        source: 'aggregated',
      },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
