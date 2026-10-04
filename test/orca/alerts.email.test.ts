import { describe, it, expect } from 'vitest'
import { emailPendingNotifications, EMAIL_MAX_ITEMS } from '@/lib/orca/alerts/emailNotifications'

const NOW = () => new Date('2026-10-03T12:00:00Z')

/**
 * user_notifications serves two reads: pending rows (select … title …) and
 * "emails sent today" (select 'user_id, emailed_at'). The mock tells them apart
 * by the selected columns.
 */
function makeSupabase(opts: { pending: any[]; profiles: any[]; emailedToday?: any[] }) {
  const updates: Array<{ table: string; patch: any; ids?: any[]; userId?: string }> = []
  function builder(table: string) {
    let cols = ''
    const rows = () =>
      table === 'user_profile' ? opts.profiles : cols.trim() === 'user_id, emailed_at' ? (opts.emailedToday ?? []) : opts.pending
    const b: any = {
      select: (c: string) => { cols = c; return b },
      is: () => b, gte: () => b, order: () => b, in: () => b, eq: () => b,
      limit: () => Promise.resolve({ data: rows() }),
      then: (resolve: any) => resolve({ data: rows() }),
      update: (patch: any) => ({
        in: (_c: string, ids: any[]) => { updates.push({ table, patch, ids }); return Promise.resolve({ data: null }) },
        eq: (_c: string, userId: string) => { updates.push({ table, patch, userId }); return Promise.resolve({ data: null }) },
      }),
    }
    return b
  }
  return { updates, from: (table: string) => builder(table) }
}

const n = (id: number, user_id: string, created_at = '2026-10-03T11:58:00Z', title = 'Binance moved $42.0M (USDT)') => ({
  id, user_id, kind: 'wallet_activity', ticker: '0x28c6…1d60', title, body: '1 transaction totalling $42.0M.',
  payload: { raw: { address: '0x28c6c06298d514db089934071355e5743bf21d60' } }, created_at,
})

const deps = (sent: any[], recipient: any = { email: 'one@example.com', unsubscribeUrl: 'https://u' }) => ({
  getRecipient: async () => recipient,
  sendAlertEmail: async (to: string, items: any[], o: any) => { sent.push({ to, n: items.length, total: o.total, unsub: o.unsubscribeUrl }); return true },
})

describe('emailPendingNotifications', () => {
  it('emails an opted-in, verified user once, marks every covered row and the profile', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1'), n(2, 'u1', '2026-10-03T11:50:00Z', 'SOL moved 5.2%'), n(3, 'u2')],
      profiles: [
        { user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'balanced' },
        { user_id: 'u2', notifications_email: false },
      ],
    })
    const sent: any[] = []
    const res = await emailPendingNotifications(sb as any, deps(sent), { now: NOW })
    // u2 is opted out: its rows are never read, so they do not count as candidates.
    expect(res).toMatchObject({ candidates: 2, users_considered: 1, sent: 1, marked: 2 })
    expect(sent).toEqual([{ to: 'one@example.com', n: 2, total: 2, unsub: 'https://u' }])
    expect(sb.updates.find((u) => u.table === 'user_notifications')?.ids).toEqual([1, 2])
    expect(sb.updates.find((u) => u.table === 'user_profile')?.userId).toBe('u1')
  })

  it('holds rows (unstamped) while the style gap is open, and only sends what fired since the last email', async () => {
    const pending = [n(1, 'u1', '2026-10-03T11:58:00Z'), n(2, 'u1', '2026-10-03T07:00:00Z')]
    // balanced = 3h gap: last email 2h ago → hold
    let sb = makeSupabase({ pending, profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: '2026-10-03T10:00:00Z', notification_style: 'balanced' }] })
    let sent: any[] = []
    let res = await emailPendingNotifications(sb as any, deps(sent), { now: NOW })
    expect(res.skipped_recent).toBe(1)
    expect(sent).toHaveLength(0)
    expect(sb.updates).toHaveLength(0)
    // last email 4h ago → send, but only the row created after it
    sb = makeSupabase({ pending, profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: '2026-10-03T08:00:00Z', notification_style: 'balanced' }] })
    sent = []
    res = await emailPendingNotifications(sb as any, deps(sent), { now: NOW })
    expect(res.sent).toBe(1)
    expect(sent[0].n).toBe(1)
    expect(sb.updates.find((u) => u.table === 'user_notifications')?.ids).toEqual([1])
  })

  it('enforces the daily cap (3, quiet 1) from emails already sent today', async () => {
    const profiles = [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: '2026-10-03T06:00:00Z', notification_style: 'frequent' }]
    const emailedToday = [
      { user_id: 'u1', emailed_at: '2026-10-03T01:00:00Z' }, { user_id: 'u1', emailed_at: '2026-10-03T01:00:00Z' },
      { user_id: 'u1', emailed_at: '2026-10-03T03:00:00Z' }, { user_id: 'u1', emailed_at: '2026-10-03T06:00:00Z' },
    ]
    const sb = makeSupabase({ pending: [n(1, 'u1')], profiles, emailedToday })
    const sent: any[] = []
    const res = await emailPendingNotifications(sb as any, deps(sent), { now: NOW })
    expect(res.skipped_daily_cap).toBe(1)
    expect(sent).toHaveLength(0)

    const quiet = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'quiet' }],
      emailedToday: [{ user_id: 'u1', emailed_at: '2026-10-03T00:30:00Z' }],
    })
    const r2 = await emailPendingNotifications(quiet as any, deps([]), { now: NOW })
    expect(r2.skipped_daily_cap).toBe(1)
  })

  it('skips users without a verified address and does not stamp their rows', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'balanced' }],
    })
    const res = await emailPendingNotifications(sb as any, deps([], null), { now: NOW })
    expect(res.skipped_unverified).toBe(1)
    expect(sb.updates).toHaveLength(0)
  })

  it('caps the rows listed in one email but reports the total', async () => {
    const pending = Array.from({ length: 12 }, (_, i) => n(i + 1, 'u1'))
    const sb = makeSupabase({ pending, profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'frequent' }] })
    const sent: any[] = []
    await emailPendingNotifications(sb as any, deps(sent), { now: NOW })
    expect(sent[0]).toMatchObject({ n: EMAIL_MAX_ITEMS, total: 12 })
    expect(sb.updates.find((u) => u.table === 'user_notifications')?.ids).toHaveLength(12)
  })

  it('does not mark rows when the provider rejects the send', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null }],
    })
    const res = await emailPendingNotifications(sb as any, {
      getRecipient: async () => ({ email: 'one@example.com' }),
      sendAlertEmail: async () => false,
    }, { now: NOW })
    expect(res.sent).toBe(0)
    expect(sb.updates).toHaveLength(0)
  })
})

describe('emailPendingNotifications — failure handling', () => {
  it('sends nothing when the "sent today" read fails (cannot prove the cap)', async () => {
    const sb: any = {
      updates: [] as any[],
      from(table: string) {
        let cols = ''
        const b: any = {
          select: (c: string) => { cols = c; return b },
          is: () => b, gte: () => b, order: () => b, in: () => b, eq: () => b,
          limit: () => {
            if (table === 'user_profile') return Promise.resolve({ data: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'frequent' }] })
            if (cols.trim() === 'user_id, emailed_at') return Promise.resolve({ data: null, error: { message: 'statement timeout' } })
            return Promise.resolve({ data: [n(1, 'u1')] })
          },
          update: () => ({ in: () => Promise.resolve({}), eq: () => Promise.resolve({}) }),
        }
        return b
      },
    }
    const sent: any[] = []
    const res = await emailPendingNotifications(sb, deps(sent), { now: NOW })
    expect(sent).toHaveLength(0)
    expect(res.sent).toBe(0)
  })
  it('stops between users once the deadline has passed', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null, notification_style: 'balanced' }],
    })
    const sent: any[] = []
    await emailPendingNotifications(sb as any, deps(sent), { now: NOW, deadlineMs: Date.now() - 1 })
    expect(sent).toHaveLength(0)
  })
})
