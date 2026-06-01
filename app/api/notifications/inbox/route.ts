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

    return NextResponse.json(
      {
        items: data ?? [],
        unread_count: count ?? 0,
        fetched_at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/notifications/inbox] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
