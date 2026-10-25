import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { parseTradesParams, applyTradesFilters, listBoundIso, TRADES_SELECT, EXACT_COUNT_MAX_HOURS } from '@/lib/trades/query'

export async function GET(req) {
  const rl = rateLimit(`trades:${getClientIp(req)}`, 120, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const p = parseTradesParams(searchParams)
  const now = Date.now()
  const from = (p.page - 1) * p.limit
  const to = from + p.limit - 1

  // Exact counts are cheap up to 7 days; beyond that the footer says "first N rows".
  const countOpt = p.sinceHours <= EXACT_COUNT_MAX_HOURS ? { count: 'exact' } : undefined
  let q = supabaseAdmin.from('all_whale_transactions').select(TRADES_SELECT, countOpt)
  q = applyTradesFilters(q, p).gte('timestamp', listBoundIso(p.sinceHours, now))

  const { data, error, count } = await q.order('timestamp', { ascending: false }).range(from, to)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    page: p.page,
    limit: p.limit,
    count: typeof count === 'number' ? count : null,
    sinceHours: p.sinceHours,
    serverNow: new Date(now).toISOString(),
    newest_ts: data?.[0]?.timestamp ?? null,
  })
}
