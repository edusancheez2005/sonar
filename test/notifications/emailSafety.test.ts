import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/app/lib/email', async () => {
  const actual: any = await vi.importActual('@/app/lib/email')
  return { ...actual, sendAlertEmailConfirmation: vi.fn(async () => true) }
})

import { signEmailLink, verifyEmailLink, unsubscribeUrl, confirmUrl, CONFIRM_TTL_MS } from '@/lib/notifications/emailLinks'
import { emailStateOf, isProviderVerified, requestAlertEmailConsent } from '@/lib/notifications/emailConsent'
import { isDeliverableEmail, sendAlertEmailConfirmation } from '@/app/lib/email'

const UID = '49f2746e-ba74-4091-8971-779d11c45045'
const OTHER = '11111111-2222-3333-4444-555555555555'

describe('signed email links', () => {
  const prev = process.env.EMAIL_LINK_SECRET
  beforeEach(() => { process.env.EMAIL_LINK_SECRET = 'test-secret' })
  afterEach(() => { process.env.EMAIL_LINK_SECRET = prev })

  it('verifies its own signature and nothing else', () => {
    const sig = signEmailLink('unsubscribe', UID)!
    expect(verifyEmailLink('unsubscribe', UID, sig)).toBe(true)
    expect(verifyEmailLink('unsubscribe', OTHER, sig)).toBe(false) // cannot unsubscribe someone else
    expect(verifyEmailLink('confirm', UID, sig)).toBe(false) // purpose-bound
    expect(verifyEmailLink('unsubscribe', UID, sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A'))).toBe(false)
    expect(verifyEmailLink('unsubscribe', 'not-a-uuid', sig)).toBe(false)
  })
  it('expires confirmation links', () => {
    const now = Date.parse('2026-10-04T12:00:00Z')
    const url = new URL(confirmUrl(UID, now)!)
    const exp = Number(url.searchParams.get('e'))
    const s = url.searchParams.get('s')
    expect(exp).toBe(now + CONFIRM_TTL_MS)
    expect(verifyEmailLink('confirm', UID, s, exp, now + 1000)).toBe(true)
    expect(verifyEmailLink('confirm', UID, s, exp, exp + 1)).toBe(false)
    expect(verifyEmailLink('confirm', UID, s, exp + 1, now)).toBe(false) // expiry is signed
  })
  it('builds absolute links on the production host', () => {
    expect(unsubscribeUrl(UID)).toMatch(/^https:\/\/www\.sonartracker\.io\/api\/notifications\/unsubscribe\?u=/)
  })
  it('makes no links without a secret', () => {
    const cron = process.env.CRON_SECRET
    delete process.env.EMAIL_LINK_SECRET
    delete process.env.CRON_SECRET
    expect(signEmailLink('unsubscribe', UID)).toBeNull()
    expect(unsubscribeUrl(UID)).toBeNull()
    process.env.CRON_SECRET = cron
  })
})

describe('deliverable addresses and consent state', () => {
  it('never emails wallet placeholder addresses', () => {
    expect(isDeliverableEmail('0xabc@wallet.sonartracker.io')).toBe(false)
    expect(isDeliverableEmail('person@example.com')).toBe(true)
    expect(isDeliverableEmail('')).toBe(false)
    expect(isDeliverableEmail(null as any)).toBe(false)
  })
  it('treats a Google identity on the same address as verified, a plain signup as pending', () => {
    const google = { id: UID, email: 'a@gmail.com', identities: [{ provider: 'google', identity_data: { email: 'a@gmail.com', email_verified: true } }] }
    const plain = { id: UID, email: 'a@corp.com', identities: [{ provider: 'email', identity_data: { email: 'a@corp.com' } }] }
    expect(isProviderVerified(google)).toBe(true)
    expect(emailStateOf(google)).toBe('verified')
    expect(emailStateOf(plain)).toBe('pending')
    expect(emailStateOf({ ...plain, app_metadata: { alert_email_verified_at: '2026-10-04T00:00:00Z' } })).toBe('verified')
    expect(emailStateOf({ id: UID, email: '0xabc@wallet.sonartracker.io' })).toBe('undeliverable')
  })
})

describe('requestAlertEmailConsent', () => {
  const prev = process.env.EMAIL_LINK_SECRET
  beforeEach(() => { process.env.EMAIL_LINK_SECRET = 'test-secret'; vi.mocked(sendAlertEmailConfirmation).mockClear() })
  afterEach(() => { process.env.EMAIL_LINK_SECRET = prev })

  function admin(user: any) {
    const updates: any[] = []
    return {
      updates,
      auth: { admin: {
        getUserById: async () => ({ data: { user } }),
        updateUserById: async (_id: string, attrs: any) => { updates.push(attrs); return {} },
      } },
    }
  }

  it('marks Google-verified users verified without sending anything', async () => {
    const a = admin({ id: UID, email: 'a@gmail.com', app_metadata: { provider: 'google' }, identities: [{ provider: 'google', identity_data: { email: 'a@gmail.com' } }] })
    expect(await requestAlertEmailConsent(a as any, UID)).toBe('verified')
    expect(sendAlertEmailConfirmation).not.toHaveBeenCalled()
    expect(a.updates[0].app_metadata.alert_email_verified_via).toBe('google')
  })
  it('sends one confirmation to an unverified address and remembers it', async () => {
    const now = Date.parse('2026-10-04T12:00:00Z')
    const a = admin({ id: UID, email: 'a@corp.com', app_metadata: { provider: 'email' }, identities: [] })
    expect(await requestAlertEmailConsent(a as any, UID, { nowMs: now })).toBe('pending')
    expect(sendAlertEmailConfirmation).toHaveBeenCalledTimes(1)
    expect(a.updates[0].app_metadata.alert_email_confirm_sent_at).toBe(new Date(now).toISOString())
    expect(a.updates[0].app_metadata.provider).toBe('email') // existing app_metadata kept
  })
  it('does not resend within a day, and never from the cron once sent', async () => {
    const now = Date.parse('2026-10-04T12:00:00Z')
    const sentAt = new Date(now - 3 * 3600 * 1000).toISOString()
    const a = admin({ id: UID, email: 'a@corp.com', app_metadata: { alert_email_confirm_sent_at: sentAt }, identities: [] })
    expect(await requestAlertEmailConsent(a as any, UID, { nowMs: now })).toBe('pending')
    const old = admin({ id: UID, email: 'a@corp.com', app_metadata: { alert_email_confirm_sent_at: new Date(now - 3 * 86400000).toISOString() }, identities: [] })
    expect(await requestAlertEmailConsent(old as any, UID, { nowMs: now, onlyIfNeverSent: true })).toBe('pending')
    expect(sendAlertEmailConfirmation).not.toHaveBeenCalled()
  })
  it('refuses wallet placeholder addresses', async () => {
    const a = admin({ id: UID, email: '0xabc@wallet.sonartracker.io', identities: [] })
    expect(await requestAlertEmailConsent(a as any, UID)).toBe('undeliverable')
    expect(sendAlertEmailConfirmation).not.toHaveBeenCalled()
  })
})
