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
import { confirmUrl } from '@/lib/notifications/emailLinks'

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

/** Current state without side effects ('pending' covers "not confirmed yet"). */
export function emailStateOf(user: AuthUserLike | null | undefined): EmailState {
  if (!user || !isDeliverableEmail(user.email)) return 'undeliverable'
  if (user.app_metadata?.alert_email_verified_at) return 'verified'
  if (isProviderVerified(user)) return 'verified'
  return 'pending'
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
  const appMeta = { ...(user.app_metadata || {}) }
  if (appMeta.alert_email_verified_at) return 'verified'

  if (isProviderVerified(user)) {
    try {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...appMeta, alert_email_verified_at: new Date(nowMs).toISOString(), alert_email_verified_via: 'google' },
      })
    } catch { /* still verified for this send */ }
    return 'verified'
  }

  const sentAt = Date.parse(appMeta.alert_email_confirm_sent_at || '')
  if (Number.isFinite(sentAt)) {
    if (opts.onlyIfNeverSent || nowMs - sentAt < RESEND_AFTER_MS) return 'pending'
  }
  const url = confirmUrl(user.id, nowMs)
  if (!url) return 'pending'
  let ok = false
  try {
    ok = !!(await sendAlertEmailConfirmation(user.email as string, url))
  } catch {
    ok = false
  }
  if (ok) {
    try {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { ...appMeta, alert_email_confirm_sent_at: new Date(nowMs).toISOString() },
      })
    } catch { /* worst case: one extra confirmation tomorrow */ }
  }
  return 'pending'
}
