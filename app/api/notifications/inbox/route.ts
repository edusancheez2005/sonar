/**
 * /api/notifications/inbox
 * =============================================================================
 * GET — the authenticated user's in-app notifications (most recent first),
 * plus an unread_count for the nav bell. Supports ?limit and ?before (cursor
 * on created_at) for pagination.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import { DAILY_CAP_BY_STYLE, MAX_INAPP_PER_DAY } from '@/lib/orca/alerts/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(request.url)
    const limitRaw = Number(url.searchParams.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT
    const before = url.searchParams.get('before')

    let query = supabaseAdminFresh
      .from('user_notifications')
      .select('id, ticker, kind, title, body, payload, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
    if (error) throw error

    // Unread count is a separate exact count (head request, no rows).
    const { count, error: countErr } = await supabaseAdminFresh
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
    if (countErr) throw countErr

    // Today's deliveries vs the user's daily cap, for the "limit reached" line.
    let todayCount: number | null = null
    let dailyCap: number | null = null
    try {
      const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
      const { count: today } = await supabaseAdminFresh
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
      const { data: prof } = await supabaseAdminFresh
        .from('user_profile')
        .select('notification_style')
        .eq('user_id', user.id)
        .maybeSingle()
      const style = (prof as any)?.notification_style === 'quiet' || (prof as any)?.notification_style === 'frequent' ? (prof as any).notification_style : 'balanced'
      todayCount = today ?? 0
      dailyCap = Math.min(DAILY_CAP_BY_STYLE[style as 'quiet' | 'balanced' | 'frequent'], MAX_INAPP_PER_DAY)
    } catch { /* optional */ }

    return NextResponse.json(
      {
        items: data ?? [],
        unread_count: count ?? 0,
        today_count: todayCount,
        daily_cap: dailyCap,
        fetched_at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/notifications/inbox] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
