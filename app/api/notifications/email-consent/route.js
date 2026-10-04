/**
 * /api/notifications/email-consent?u=<user id>&e=<expiry ms>&s=<signature>
 * =============================================================================
 * Double opt-in for alert emails (lib/notifications/emailConsent). The link
 * arrives in the one-time "Confirm your Sonar alert emails" email.
 *   GET  → a page with a "Confirm alert emails" button (no side effects).
 *   POST → marks the address verified (app_metadata, service role only) and
 *          switches alert emails on.
 */
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isDeliverableEmail } from '@/app/lib/email'
import { verifyEmailLink } from '@/lib/notifications/emailLinks'
import { noticePage, htmlResponse } from '@/lib/notifications/noticePage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SETTINGS = { href: '/dashboard/personal?tab=alerts', label: 'Open alert settings' }

function linkParams(req) {
  const url = new URL(req.url)
  const exp = Number(url.searchParams.get('e'))
  return { uid: url.searchParams.get('u'), sig: url.searchParams.get('s'), exp: Number.isFinite(exp) ? exp : NaN }
}

function invalid() {
  return htmlResponse(noticePage({
    title: 'This link has expired',
    body: 'Confirmation links work for 7 days. Switch alert emails on again in your alert settings and we will send a fresh one.',
    link: SETTINGS,
  }), 400)
}

export async function GET(req) {
  const { uid, sig, exp } = linkParams(req)
  if (!verifyEmailLink('confirm', uid, sig, exp)) return invalid()
  return htmlResponse(noticePage({
    title: 'Confirm alert emails',
    body: 'Sonar will email this address when the wallets and tokens you follow move. At most 3 alert emails a day, and every email has a one-click off switch.',
    form: { action: `/api/notifications/email-consent?u=${encodeURIComponent(uid)}&e=${exp}&s=${encodeURIComponent(sig)}`, label: 'Confirm alert emails' },
  }))
}

export async function POST(req) {
  const { uid, sig, exp } = linkParams(req)
  if (!verifyEmailLink('confirm', uid, sig, exp)) return invalid()
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(uid)
    const user = data?.user
    if (!user || !isDeliverableEmail(user.email)) return invalid()
    await supabaseAdmin.auth.admin.updateUserById(uid, {
      app_metadata: { ...(user.app_metadata || {}), alert_email_verified_at: new Date().toISOString(), alert_email_verified_via: 'link' },
    })
    await supabaseAdmin
      .from('user_profile')
      .upsert({ user_id: uid, notifications_email: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  } catch (e) {
    console.error('[email-consent] failed', e?.message || e)
    return htmlResponse(noticePage({ title: 'Something went wrong', body: 'Please try the link again in a minute.', link: SETTINGS }), 500)
  }
  return htmlResponse(noticePage({
    title: 'Alert emails are on',
    body: 'Done. Sonar will email you when your alerts fire, at most 3 times a day.',
    link: { href: '/dashboard', label: 'Back to Sonar' },
  }))
}
