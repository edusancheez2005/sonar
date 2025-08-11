import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, limitRaw), 200)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score')
    .order('timestamp', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, page, limit },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
} 