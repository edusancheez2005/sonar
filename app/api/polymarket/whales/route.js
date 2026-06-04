import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Polymarket whale leaderboard ranked by total position size.
export async function GET(req) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '40', 10)), 100)

  const { data, error } = await supabaseAdmin
    .from('polymarket_whales')
    .select('*')
    .order('total_amount', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
