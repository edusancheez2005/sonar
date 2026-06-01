/**
 * /api/notifications/preferences
 * =============================================================================
 * GET   — return the authenticated user's notification channel preferences.
 * PATCH — update notifications_in_app / notification_style.
 *
 * Backs the channel controls on the dashboard Alerts tab. In-app inbox only.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STYLES = new Set(['quiet', 'balanced', 'frequent'])

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { data, error } = await supabaseAdminFresh
      .from('user_profile')
      .select('notifications_in_app, notification_style')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error

    return NextResponse.json(
      {
        notifications_in_app: data?.notifications_in_app ?? true,
        notification_style: data?.notification_style ?? 'balanced',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/notifications/preferences GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
    if (typeof (body as any).notifications_in_app === 'boolean') {
      patch.notifications_in_app = (body as any).notifications_in_app
    }
    if (typeof (body as any).notification_style === 'string') {
      if (!STYLES.has((body as any).notification_style)) {
        return NextResponse.json({ error: 'invalid_style' }, { status: 400 })
      }
      patch.notification_style = (body as any).notification_style
    }

    const { data, error } = await supabaseAdminFresh
      .from('user_profile')
      .upsert(patch, { onConflict: 'user_id' })
      .select('notifications_in_app, notification_style')
      .single()
    if (error) throw error

    return NextResponse.json({ preferences: data })
  } catch (err) {
    console.error('[api/notifications/preferences PATCH] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
