/**
 * POST /api/personal/alerts/test — "Send me a test".
 * One inbox row marked payload.test so the user sees where alerts land.
 * Capped at 3 per user per hour; the alert cron and the email digest ignore
 * these rows (they never count against caps and are never emailed).
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEST_ALERTS_PER_HOUR = 3

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const since = new Date(Date.now() - 3_600_000).toISOString()
    const { count } = await supabaseAdminFresh
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('payload->>test', 'true')
      .gte('created_at', since)
    if ((count ?? 0) >= TEST_ALERTS_PER_HOUR) {
      return NextResponse.json({ error: 'test_limit' }, { status: 429 })
    }

    const now = new Date().toISOString()
    const { data, error } = await supabaseAdminFresh
      .from('user_notifications')
      .insert({
        user_id: user.id,
        rule_id: null,
        kind: 'price_move',
        ticker: 'BTC',
        title: 'Test alert',
        body: 'This is a test. Your real alerts arrive here, in the bell, the same way.',
        payload: { test: true },
        dedup_hour: now,
      })
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, id: data?.id ?? null })
  } catch (err) {
    console.error('[api/personal/alerts/test POST] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
