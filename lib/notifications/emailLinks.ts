/**
 * Signed links for alert emails (server only).
 * =============================================================================
 * unsubscribe — one-click opt-out from alert emails; never expires (RFC 8058
 *               List-Unsubscribe-Post points at the same URL).
 * confirm     — double opt-in for alert emails; expires after 7 days.
 * HMAC-SHA256 over "purpose:userId:exp" with EMAIL_LINK_SECRET (falls back to
 * CRON_SECRET). No secret configured → no links (callers skip the feature).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type EmailLinkPurpose = 'unsubscribe' | 'confirm'

export const SITE_URL = 'https://www.sonartracker.io'
export const CONFIRM_TTL_MS = 7 * 24 * 3600 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function secret(): string | null {
  return process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET || null
}

export function signEmailLink(purpose: EmailLinkPurpose, userId: string, exp: number | null = null): string | null {
  const key = secret()
  if (!key || !UUID_RE.test(userId)) return null
  return createHmac('sha256', key)
    .update(`${purpose}:${userId}:${exp ?? ''}`)
    .digest('base64url')
    .slice(0, 32)
}

export function verifyEmailLink(
  purpose: EmailLinkPurpose,
  userId: string | null,
  sig: string | null,
  exp: number | null = null,
  nowMs: number = Date.now()
): boolean {
  if (!userId || !sig || !UUID_RE.test(userId)) return false
  if (exp !== null && (!Number.isFinite(exp) || exp < nowMs)) return false
  const expected = signEmailLink(purpose, userId, exp)
  if (!expected || expected.length !== sig.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export function unsubscribeUrl(userId: string): string | null {
  const s = signEmailLink('unsubscribe', userId)
  return s ? `${SITE_URL}/api/notifications/unsubscribe?u=${userId}&s=${s}` : null
}

export function confirmUrl(userId: string, nowMs: number = Date.now()): string | null {
  const exp = nowMs + CONFIRM_TTL_MS
  const s = signEmailLink('confirm', userId, exp)
  return s ? `${SITE_URL}/api/notifications/email-consent?u=${userId}&e=${exp}&s=${s}` : null
}
