import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Polymarket whale leaderboard ranked by total position size.
//
// PERF: select only the columns the leaderboard renders. We deliberately
// exclude the `positions` JSONB blob (full open-position snapshots), which is
// only needed in the whale drill-down drawer — fetch it there via
// ?include=positions. `arkham_entity` is the Arkham-resolved real name
// (scripts/sync_arkham_polymarket.py); it takes priority over pseudonyms in
// the UI so whales stop showing as "—".
const BASE_COLUMNS = 'proxy_wallet,name,arkham_entity,profile_image,total_amount,markets_count,updated_at'

export async function GET(req) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '40', 10)), 100)
  const includePositions = searchParams.get('include') === 'positions'
  const columns = includePositions ? `${BASE_COLUMNS},positions` : BASE_COLUMNS

  const { data, error } = await supabaseAdmin
    .from('polymarket_whales')
    .select(columns)
    .order('total_amount', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { data: data || [] },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } },
  )
}
