/**
 * /api/notifications/unsubscribe?u=<user id>&s=<signature>
 * =============================================================================
 * One-click opt-out from alert emails (link in every alert email, and the
 * List-Unsubscribe / List-Unsubscribe-Post header for Gmail/Apple's button).
 *   GET  → a page with a "Turn off alert emails" button (scanners pre-open
 *          links, so GET never changes anything).
 *   POST → sets user_profile.notifications_email = false. RFC 8058 one-click
 *          POSTs land here too.
 * The signature is an HMAC of the user id (lib/notifications/emailLinks), so
 * nobody can unsubscribe someone else.
 */
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { verifyEmailLink } from '@/lib/notifications/emailLinks'
import { noticePage, htmlResponse } from '@/lib/notifications/noticePage'
import { recordEmailChoice } from '@/lib/notifications/emailConsent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SETTINGS = { href: '/dashboard/personal?tab=alerts', label: 'Open alert settings' }

function linkParams(req) {
  const url = new URL(req.url)
  return { uid: url.searchParams.get('u'), sig: url.searchParams.get('s') }
}

function invalid() {
  return htmlResponse(noticePage({
    title: 'This link is not valid',
    body: 'It may have been copied incompletely. You can switch alert emails off in your alert settings.',
    link: SETTINGS,
  }), 400)
}

export async function GET(req) {
  const { uid, sig } = linkParams(req)
  if (!verifyEmailLink('unsubscribe', uid, sig)) return invalid()
  return htmlResponse(noticePage({
    title: 'Turn off alert emails?',
    body: 'You will stop getting Sonar alert emails and the daily "Your whales moved" email. Alerts still show in your Sonar inbox, and you can switch emails back on any time.',
    form: { action: `/api/notifications/unsubscribe?u=${encodeURIComponent(uid)}&s=${encodeURIComponent(sig)}`, label: 'Turn off alert emails' },
  }))
}

export async function POST(req) {
  const { uid, sig } = linkParams(req)
  if (!verifyEmailLink('unsubscribe', uid, sig)) return invalid()
  try {
    await supabaseAdmin
      .from('user_profile')
      .upsert({ user_id: uid, notifications_email: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    // Explicit "off": also stops the daily "Your whales moved" digest.
    await recordEmailChoice(supabaseAdmin, uid, 'off')
  } catch (e) {
    console.error('[unsubscribe] update failed', e?.message || e)
    return htmlResponse(noticePage({ title: 'Something went wrong', body: 'Please try again, or switch alert emails off in your alert settings.', link: SETTINGS }), 500)
  }
  return htmlResponse(noticePage({
    title: 'Alert emails are off',
    body: 'You will not get any more Sonar alert or daily whale emails. Your alerts keep working in the Sonar inbox.',
    link: SETTINGS,
  }))
}
