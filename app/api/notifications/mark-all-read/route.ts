/**
 * /api/notifications/mark-all-read
 * =============================================================================
 * POST   — mark every unread notification for the authenticated user as read.
 * DELETE — remove every notification for the authenticated user (dismiss all).
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { data, error } = await supabaseAdminFresh
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
      .select('id')
    if (error) throw error

    return NextResponse.json({ ok: true, updated: Array.isArray(data) ? data.length : 0 })
  } catch (err) {
    console.error('[api/notifications/mark-all-read] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { data, error } = await supabaseAdminFresh
      .from('user_notifications')
      .delete()
      .eq('user_id', user.id)
      .select('id')
    if (error) throw error

    return NextResponse.json({ ok: true, deleted: Array.isArray(data) ? data.length : 0 })
  } catch (err) {
    console.error('[api/notifications/mark-all-read] delete failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

