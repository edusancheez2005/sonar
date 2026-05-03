// Diagnostic-only endpoint. CRON_SECRET-gated. Returns raw rows from
// figure_backtests so we can see whether the nightly cron actually
// populated return_pct_* columns or silently wrote nulls.
import { NextResponse } from 'next/server'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdminFresh
    .from('figure_backtests')
    .select('*')
    .order('computed_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: data?.length || 0, fetched_at: new Date().toISOString(), rows: data || [] })
}
