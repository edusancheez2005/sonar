/**
 * /api/notifications/preferences
 * =============================================================================
 * GET   — the authenticated user's notification channel preferences, plus
 *         email_state for alert emails: 'verified' | 'pending' (confirmation
 *         email not clicked yet) | 'undeliverable' (no real address, e.g. a
 *         wallet sign-in).
 * PATCH — update notifications_in_app / notification_style / notifications_email.
 *         Turning email on starts the double opt-in for addresses the identity
 *         provider has not verified (lib/notifications/emailConsent).
 *
 * Backs the Delivery controls on the dashboard Alerts tab and the welcome
 * dialog's "Also email me when they move" box.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import {
  emailStateOf,
  explicitEmailChoice,
  recordEmailChoice,
  requestAlertEmailConsent,
  type EmailState,
} from '@/lib/notifications/emailConsent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STYLES = new Set(['quiet', 'balanced', 'frequent'])

async function currentEmailInfo(userId: string): Promise<{ state: EmailState; choiceMade: boolean | null }> {
  try {
    const { data, error } = await supabaseAdminFresh.auth.admin.getUserById(userId)
    if (error || !data?.user) return { state: 'pending', choiceMade: null } // unknown
    return { state: emailStateOf(data.user as any), choiceMade: explicitEmailChoice(data.user as any) !== null }
  } catch {
    return { state: 'pending', choiceMade: null }
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const [{ data, error }, info] = await Promise.all([
      supabaseAdminFresh
        .from('user_profile')
        .select('notifications_in_app, notification_style, notifications_email')
        .eq('user_id', user.id)
        .maybeSingle(),
      currentEmailInfo(user.id),
    ])
    if (error) throw error

    return NextResponse.json(
      {
        notifications_in_app: data?.notifications_in_app ?? true,
        notification_style: data?.notification_style ?? 'balanced',
        notifications_email: data?.notifications_email ?? false,
        email_state: info.state,
        email_choice_made: info.choiceMade,
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

    let email_state: EmailState | undefined
    if (typeof (body as any).notifications_email === 'boolean') {
      if ((body as any).notifications_email) {
        email_state = await requestAlertEmailConsent(supabaseAdminFresh as any, user.id)
        if (email_state === 'undeliverable') {
          return NextResponse.json({ error: 'no_deliverable_email', email_state }, { status: 409 })
        }
      }
      patch.notifications_email = (body as any).notifications_email
      await recordEmailChoice(supabaseAdminFresh as any, user.id, (body as any).notifications_email ? 'on' : 'off')
    }

    const { data, error } = await supabaseAdminFresh
      .from('user_profile')
      .upsert(patch, { onConflict: 'user_id' })
      .select('notifications_in_app, notification_style, notifications_email')
      .single()
    if (error) throw error

    return NextResponse.json({ preferences: data, email_state: email_state ?? (await currentEmailInfo(user.id)).state })
  } catch (err) {
    console.error('[api/notifications/preferences PATCH] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
