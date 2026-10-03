/**
 * POST /api/onboarding/first-login
 * =============================================================================
 * The shared post-signup hook. Email signups got a welcome email from
 * /api/auth/signup; Google (and any other OAuth/wallet) signups got nothing,
 * because no server code ever ran for them. FirstRunWelcome calls this the
 * first time the dashboard opens for an account; it:
 *
 *   1. sends the welcome email once (claim-first on user_metadata so a double
 *      mount or a second device cannot send twice), only for accounts created
 *      in the last 7 days (older accounts seeing the dialog on a new device
 *      must not get a "welcome" email);
 *   2. logs the `signup` funnel event with the real provider.
 *
 * Auth: Supabase user JWT. Always 200 with { sent, reason } — never blocks UI.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { sendWelcomeEmail } from '@/app/lib/email'
import { trackServer } from '@/lib/analytics/trackServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 3600 * 1000

function displayNameOf(u) {
  const m = u?.user_metadata || {}
  const raw = m.full_name || m.name || ''
  return String(raw).trim()
}

export async function POST(req) {
  const authed = await getUserFromRequest(req)
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })

  let u = null
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(authed.id)
    u = data?.user || null
  } catch {
    u = null
  }
  if (!u) return NextResponse.json({ ok: true, sent: false, reason: 'no_user' }, { headers: NO_STORE })

  const meta = u.user_metadata || {}
  if (meta.welcome_email_sent_at) {
    return NextResponse.json({ ok: true, sent: false, reason: 'already' }, { headers: NO_STORE })
  }

  const createdMs = Date.parse(u.created_at || '')
  const isNew = Number.isFinite(createdMs) && Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS

  // Claim first: whatever happens next, this account is never processed twice.
  try {
    await supabaseAdmin.auth.admin.updateUserById(u.id, {
      user_metadata: { ...meta, welcome_email_sent_at: new Date().toISOString(), welcome_email_via: isNew ? 'first_login' : 'skipped_not_new' },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, sent: false, reason: 'claim_failed' }, { headers: NO_STORE })
  }

  if (!isNew) {
    return NextResponse.json({ ok: true, sent: false, reason: 'not_new' }, { headers: NO_STORE })
  }

  const provider = u.app_metadata?.provider || 'email'
  void trackServer(supabaseAdmin, {
    userId: u.id,
    event: 'signup',
    props: { method: provider, via: 'first_login' },
    path: '/dashboard',
  })

  let sent = false
  if (u.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) {
    try {
      sent = !!(await sendWelcomeEmail(u.email, displayNameOf(u)))
    } catch {
      sent = false
    }
  }
  return NextResponse.json({ ok: true, sent, reason: sent ? 'sent' : 'no_email_or_failed', provider }, { headers: NO_STORE })
}
