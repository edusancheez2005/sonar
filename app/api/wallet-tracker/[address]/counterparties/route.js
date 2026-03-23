import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req, { params }) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { address } = await params
  const { searchParams } = new URL(req.url)
  const limitRaw = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(1, limitRaw), 100)

  // Fetch transactions involving this address (use whale_address for indexed lookup)
  const { data: txData, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('from_address, to_address, usd_value')
    .eq('whale_address', address)
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate counterparties client-side
  const counterpartyMap = new Map()
  for (const tx of txData || []) {
    const counterparty = tx.from_address === address ? tx.to_address : tx.from_address
    if (!counterparty || counterparty === address) continue
    const entry = counterpartyMap.get(counterparty) || { address: counterparty, tx_count: 0, total_volume: 0 }
    entry.tx_count += 1
    entry.total_volume += Number(tx.usd_value) || 0
    counterpartyMap.set(counterparty, entry)
  }

  const data = Array.from(counterpartyMap.values())
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, limit)

  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
