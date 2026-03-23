import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req, { params }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { address } = await params
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
