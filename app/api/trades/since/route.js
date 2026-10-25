/**
 * GET /api/trades/since?after=<ISO>&… — rows newer than `after`, same filters
 * as /api/trades. Polled by the Statistics table every 3 s; the client
 * rounds `after` down to 10 s so open tabs share one edge entry (2 s cache).
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { parseTradesParams, parseAfter, sinceBoundIso, applyTradesFilters, TRADES_SELECT } from '@/lib/trades/query'

export async function GET(req) {
  const rl = rateLimit(`trades-since:${getClientIp(req)}`, 120, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const now = Date.now()
  const after = parseAfter(searchParams.get('after'), now)
  if (!after) return NextResponse.json({ error: 'after must be an ISO timestamp' }, { status: 400 })
  const p = parseTradesParams(searchParams)

  let q = supabaseAdmin.from('all_whale_transactions').select(TRADES_SELECT)
  q = applyTradesFilters(q, p).gte('timestamp', sinceBoundIso(after, p.sinceHours, now))
  const { data, error } = await q.order('timestamp', { ascending: false }).limit(p.limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      data: data || [],
      count: (data || []).length,
      serverNow: new Date(now).toISOString(),
      newest_ts: data?.[0]?.timestamp ?? null,
    },
    { headers: { 'Cache-Control': 's-maxage=2, stale-while-revalidate=2' } }
  )
}
