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
  const chain = searchParams.get('chain') || null
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, limitRaw), 200)
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

  // Query whale_address first (likely indexed), then fall back to from/to
  let query = supabaseAdmin
    .from('all_whale_transactions')
    .select('*')
    .eq('whale_address', address)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  if (chain) {
    query = query.eq('blockchain', chain)
  }

  let { data, error } = await query

  // If no results from whale_address, try from_address
  if (!error && (!data || data.length === 0) && offset === 0) {
    let fallback = supabaseAdmin
      .from('all_whale_transactions')
      .select('*')
      .eq('from_address', address)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (chain) fallback = fallback.eq('blockchain', chain)

    const fb = await fallback
    if (!fb.error && fb.data?.length > 0) {
      data = fb.data
      error = fb.error
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, limit, offset },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
}
