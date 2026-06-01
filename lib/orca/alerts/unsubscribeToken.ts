/**
 * ORCA Alerts — email unsubscribe tokens
 * =============================================================================
 * One-click unsubscribe links carry a stateless, signed token so the
 * /api/notifications/unsubscribe endpoint can flip notifications_email off
 * without the user being logged in (CAN-SPAM / brevo compliance §11).
 *
 * Token = base64url(payload) + "." + base64url(HMAC-SHA256(payload)).
 * payload = { uid, iat }. No expiry by design — unsubscribe links must keep
 * working indefinitely. Uses Node crypto only (zero new dependencies).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function secret(): string {
  const s = process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET
  if (!s) throw new Error('NOTIFICATIONS_UNSUBSCRIBE_SECRET not set')
  return s
}

export function signUnsubscribeToken(userId: string, at: Date = new Date()): string {
  const payload = b64url(Buffer.from(JSON.stringify({ uid: userId, iat: Math.floor(at.getTime() / 1000) })))
  const sig = b64url(createHmac('sha256', secret()).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  try {
    if (typeof token !== 'string' || !token.includes('.')) return null
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const expected = b64url(createHmac('sha256', secret()).update(payload).digest())
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const parsed = JSON.parse(fromB64url(payload).toString('utf8')) as { uid?: unknown }
    if (typeof parsed?.uid !== 'string' || parsed.uid.length === 0) return null
    return { userId: parsed.uid }
  } catch {
    return null
  }
}
