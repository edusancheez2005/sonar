/**
 * /api/notifications/[id]
 * =============================================================================
 * PATCH — mark a single notification read (body: { read: true }) or unread.
 * DELETE — permanently dismiss a single notification for the owner.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const id = Number(params?.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const read = (body as any)?.read !== false // default true
    const read_at = read ? new Date().toISOString() : null

    const { data, error } = await supabaseAdminFresh
      .from('user_notifications')
      .update({ read_at })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, read_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    return NextResponse.json({ notification: data })
  } catch (err) {
    console.error('[api/notifications/[id] PATCH] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const id = Number(params?.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
    }

    const { error } = await supabaseAdminFresh
      .from('user_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/notifications/[id] DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
