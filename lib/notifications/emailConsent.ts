/**
 * Alert-email consent (server only).
 * =============================================================================
 * Email sign-ups are created already confirmed (/api/auth/signup sets
 * email_confirm: true), so nothing proves the person owns the address. Before
 * this, anyone could sign up as victim@corp.com, tick "email me", and have
 * Sonar send that inbox alert emails every hour. Alert emails therefore go
 * only to addresses that are:
 *   - verified by the identity provider (a Google identity on the same email), or
 *   - confirmed through a signed link (app_metadata.alert_email_verified_at,
 *     writable only with the service role).
 * Wallet accounts carry a placeholder <address>@wallet.sonartracker.io and are
 * never emailed.
 */
import { isDeliverableEmail, sendAlertEmailConfirmation } from '@/app/lib/email'
import { confirmUrl, emailBinding } from '@/lib/notifications/emailLinks'

export type EmailState = 'verified' | 'pending' | 'undeliverable'

const RESEND_AFTER_MS = 24 * 3600 * 1000

interface AuthUserLike {
  id: string
  email?: string | null
  app_metadata?: Record<string, any> | null
  identities?: Array<{ provider?: string; identity_data?: Record<string, any> | null }> | null
}

type AdminClient = {
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{ data: { user: AuthUserLike | null } | null; error?: unknown }>
      updateUserById: (id: string, attrs: Record<string, unknown>) => Promise<unknown>
    }
  }
}

export function isProviderVerified(user: AuthUserLike | null | undefined): boolean {
  if (!user?.email) return false
  const email = user.email.toLowerCase()
  const ids = Array.isArray(user.identities) ? user.identities : []
  if (ids.length > 0) {
    return ids.some(
      (i) =>
        i?.provider === 'google' &&
        String(i?.identity_data?.email || '').toLowerCase() === email &&
        i?.identity_data?.email_verified !== false
    )
  }
  const providers: string[] = Array.isArray(user.app_metadata?.providers) ? user.app_metadata!.providers : []
  return user.app_metadata?.provider === 'google' || providers.includes('google')
}

/** True when the stored confirmation was for the address the account has now. */
function confirmedForCurrentEmail(user: AuthUserLike): boolean {
  const meta = user.app_metadata || {}
  return !!meta.alert_email_verified_at && meta.alert_email_verified_for === emailBinding(user.email)
}

/** Current state without side effects ('pending' covers "not confirmed yet"). */
export function emailStateOf(user: AuthUserLike | null | undefined): EmailState {
  if (!user || !isDeliverableEmail(user.email)) return 'undeliverable'
  if (confirmedForCurrentEmail(user)) return 'verified'
  if (isProviderVerified(user)) return 'verified'
  return 'pending'
}

/**
 * The user's explicit email choice ('on' / 'off'), recorded in app_metadata
 * whenever they use the Email toggle, the welcome-dialog box, the confirm link
 * or the unsubscribe link. null = never chose (pre-existing users).
 */
export function explicitEmailChoice(user: AuthUserLike | null | undefined): 'on' | 'off' | null {
  const v = user?.app_metadata?.email_pref
  return v === 'on' || v === 'off' ? v : null
}

/**
 * Record the explicit choice. Returns false when it could not be saved.
 * Writes only the keys it changes: GoTrue merges top-level app_metadata keys,
 * and spreading a stale snapshot could revert a concurrent change.
 */
export async function recordEmailChoice(admin: AdminClient, userId: string, choice: 'on' | 'off'): Promise<boolean> {
  try {
    const res: any = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { email_pref: choice, email_pref_at: new Date().toISOString() },
    })
    return !res?.error
  } catch {
    return false
  }
}

/**
 * Make sure the user can receive alert emails. Marks provider-verified users
 * as verified; otherwise sends the confirmation email (at most once a day, or
 * only if never sent when onlyIfNeverSent). Never throws.
 */
export async function requestAlertEmailConsent(
  admin: AdminClient,
  userId: string,
  opts: { onlyIfNeverSent?: boolean; nowMs?: number } = {}
): Promise<EmailState> {
  const nowMs = opts.nowMs ?? Date.now()
  let user: AuthUserLike | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    user = data?.user ?? null
  } catch {
    user = null
  }
  if (!user || !isDeliverableEmail(user.email)) return 'undeliverable'
  const appMeta = user.app_metadata || {}
  const binding = emailBinding(user.email)
  if (confirmedForCurrentEmail(user)) return 'verified'

  if (isProviderVerified(user)) {
    try {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          alert_email_verified_at: new Date(nowMs).toISOString(),
          alert_email_verified_via: 'google',
          alert_email_verified_for: binding,
        },
      })
    } catch { /* still verified for this send */ }
    return 'verified'
  }

  // A confirmation already sent to THIS address recently (or ever, from the cron).
  const sentAt = Date.parse(appMeta.alert_email_confirm_sent_at || '')
  if (Number.isFinite(sentAt) && appMeta.alert_email_confirm_sent_for === binding) {
    if (opts.onlyIfNeverSent || nowMs - sentAt < RESEND_AFTER_MS) return 'pending'
  }
  const url = confirmUrl(user.id, user.email as string, nowMs)
  if (!url) return 'pending'

  // Claim first: if the claim cannot be written, do not send — otherwise every
  // 5-minute cron run would send another confirmation.
  const claim = { alert_email_confirm_sent_at: new Date(nowMs).toISOString(), alert_email_confirm_sent_for: binding }
  let claimed = false
  try {
    const res: any = await admin.auth.admin.updateUserById(user.id, { app_metadata: claim })
    claimed = !res?.error
  } catch {
    claimed = false
  }
  if (!claimed) return 'pending'

  let ok = false
  try {
    ok = !!(await sendAlertEmailConfirmation(user.email as string, url))
  } catch {
    ok = false
  }
  if (!ok) {
    // Release the claim so a later attempt can try again.
    try {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { alert_email_confirm_sent_at: null, alert_email_confirm_sent_for: null }, // null deletes the key
      })
    } catch { /* next day at the latest */ }
  }
  return 'pending'
}
