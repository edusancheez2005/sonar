import { describe, it, expect } from 'vitest'
import { emailPendingNotifications, EMAIL_MAX_ITEMS } from '@/lib/orca/alerts/emailNotifications'

const NOW = () => new Date('2026-10-03T12:00:00Z')

function makeSupabase(opts: { pending: any[]; profiles: any[] }) {
  const updates: Array<{ table: string; patch: any; ids?: any[]; userId?: string }> = []
  function builder(rows: any[], table: string) {
    const b: any = {
      select: () => b, is: () => b, gte: () => b, order: () => b, in: () => b, eq: () => b,
      limit: () => Promise.resolve({ data: rows }),
      then: (resolve: any) => resolve({ data: rows }),
      update: (patch: any) => {
        const u: any = {
          in: (_col: string, ids: any[]) => { updates.push({ table, patch, ids }); return Promise.resolve({ data: null }) },
          eq: (_col: string, userId: string) => { updates.push({ table, patch, userId }); return Promise.resolve({ data: null }) },
        }
        return u
      },
    }
    return b
  }
  return {
    updates,
    from(table: string) {
      if (table === 'user_notifications') return builder(opts.pending, table)
      if (table === 'user_profile') return builder(opts.profiles, table)
      return builder([], table)
    },
  }
}

const n = (id: number, user_id: string, title = 'Wallet 0xab…cd active') => ({
  id, user_id, kind: 'wallet_activity', ticker: '0xab…cd', title, body: '1 transaction totalling $50K in the last hour.',
  payload: { raw: { address: '0xabcd' } }, created_at: '2026-10-03T11:58:00Z',
})

describe('emailPendingNotifications', () => {
  it('emails opted-in users once, marks the rows and the profile', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1'), n(2, 'u1', 'SOL -5.2% in last 24h'), n(3, 'u2')],
      profiles: [
        { user_id: 'u1', notifications_email: true, notifications_last_email_at: null },
        { user_id: 'u2', notifications_email: false, notifications_last_email_at: null },
      ],
    })
    const sent: Array<{ to: string; n: number }> = []
    const res = await emailPendingNotifications(sb as any, {
      getEmail: async (uid) => (uid === 'u1' ? 'one@example.com' : null),
      sendAlertEmail: async (to, items) => { sent.push({ to, n: items.length }); return true },
    }, { now: NOW })
    expect(res).toMatchObject({ candidates: 3, users_considered: 2, sent: 1, marked: 2, skipped_opt_out: 1, skipped_recent: 0 })
    expect(sent).toEqual([{ to: 'one@example.com', n: 2 }])
    expect(sb.updates.find((u) => u.table === 'user_notifications')?.ids).toEqual([1, 2])
    expect(sb.updates.find((u) => u.table === 'user_profile')?.userId).toBe('u1')
  })
  it('respects the one-email-per-hour gap', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: '2026-10-03T11:30:00Z' }],
    })
    let calls = 0
    const res = await emailPendingNotifications(sb as any, {
      getEmail: async () => 'one@example.com',
      sendAlertEmail: async () => { calls += 1; return true },
    }, { now: NOW })
    expect(calls).toBe(0)
    expect(res.skipped_recent).toBe(1)
  })
  it('does not mark rows when the provider rejects the send', async () => {
    const sb = makeSupabase({
      pending: [n(1, 'u1')],
      profiles: [{ user_id: 'u1', notifications_email: true, notifications_last_email_at: null }],
    })
    const res = await emailPendingNotifications(sb as any, {
      getEmail: async () => 'one@example.com',
      sendAlertEmail: async () => false,
    }, { now: NOW })
    expect(res.sent).toBe(0)
    expect(sb.updates).toHaveLength(0)
  })
  it('caps the items in one email', () => {
    expect(EMAIL_MAX_ITEMS).toBeLessThanOrEqual(10)
  })
})
