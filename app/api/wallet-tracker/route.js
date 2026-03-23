import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const VALID_SORT = ['smart_money_score', 'total_volume_usd_30d', 'portfolio_value_usd', 'pnl_estimated_usd']

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const sortBy = VALID_SORT.includes(searchParams.get('sort_by'))
    ? searchParams.get('sort_by')
    : 'smart_money_score'
  const chain = searchParams.get('chain') || null
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, limitRaw), 100)

  let query = supabaseAdmin
    .from('wallet_profiles')
    .select('*')
    .order(sortBy, { ascending: false })
    .limit(limit)

  if (chain) {
    query = query.eq('chain', chain)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, sort_by: sortBy, limit },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
