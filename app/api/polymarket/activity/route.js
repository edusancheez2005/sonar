import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Live Polymarket whale-activity tape — the "terminal" feed of large trades.
// Populated by scripts/sync_arkham_polymarket.py (Arkham /polymarket/activity),
// entity-resolved so trades show real names. Read-only; service role stays
// server-side.
//
//   ?limit=N           rows (default 50, max 200)
//   ?min_usd=N         minimum notional (default 0 — table is already filtered
//                      by the cron's floor)
//   ?condition_id=0x   restrict to a single market
const ACTIVITY_COLUMNS =
  'tx_hash,condition_id,proxy_wallet,entity_name,name,side,outcome,outcome_index,usd_value,price,size,ts'

export async function GET(req) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 200)
  const minUsd = Math.max(0, parseInt(searchParams.get('min_usd') || '0', 10))
  const conditionId = (searchParams.get('condition_id') || '').trim()

  let q = supabaseAdmin.from('polymarket_activity').select(ACTIVITY_COLUMNS)
  if (minUsd > 0) q = q.gte('usd_value', minUsd)
  if (conditionId) q = q.eq('condition_id', conditionId)
  q = q.order('ts', { ascending: false, nullsFirst: false }).limit(limit)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { data: data || [] },
    { headers: { 'Cache-Control': 's-maxage=20, stale-while-revalidate=40' } },
  )
}
