import { describe, it, expect, vi } from 'vitest'

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
  supabaseAdminFresh: vi.fn(() => ({ from: vi.fn() })),
}))

import { runCheckUserAlerts } from '@/lib/orca/alerts/runCheckUserAlerts'

/**
 * Table-aware Supabase mock for the alert-evaluation cron. Each table is a
 * thenable query builder that ignores filter args (the cron filters in JS for
 * the parts that matter) and resolves to a configured row set. Upserts are
 * captured so the test can assert what got inserted.
 */
function makeSupabase(config: {
  profiles?: any[]
  rules?: any[]
  priceByTicker?: Record<string, number>
  notificationsUsed?: number
  inserted?: any[]
}) {
  const inserted = config.inserted ?? []
  function builder(rows: any[]) {
    const b: any = {
      select: () => b,
      eq: () => b,
      in: () => b,
      gte: () => b,
      order: () => b,
      limit: () => Promise.resolve({ data: rows }),
      then: (resolve: any) => resolve({ data: rows }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }
    return b
  }
  return {
    inserted,
    from(table: string) {
      if (table === 'user_profile') return builder(config.profiles ?? [])
      if (table === 'user_alerts') return builder(config.rules ?? [])
      if (table === 'price_snapshots') {
        // The evaluator pairs the newest snapshot with the oldest one >= 45 min
        // back to compute a ~1h move. priceByTicker holds the desired % move;
        // the eq() arg is swallowed, so return the only configured ticker.
        const vals = Object.values(config.priceByTicker ?? {})
        if (!vals.length) return builder([])
        const pct = Number(vals[0])
        return builder([
          { price_usd: 100 * (1 + pct / 100), timestamp: '2026-06-03T11:55:00Z' },
          { price_usd: 100, timestamp: '2026-06-03T11:00:00Z' },
        ])
      }
      if (table === 'user_notifications') {
        const used = Array.from({ length: config.notificationsUsed ?? 0 }, (_, i) => ({ id: i }))
        const b: any = {
          select: () => b,
          eq: () => b,
          gte: () => b,
          limit: () => Promise.resolve({ data: used }),
          then: (resolve: any) => resolve({ data: used }),
          upsert: (rows: any[]) => {
            inserted.push(...rows)
            return {
              select: () => Promise.resolve({ data: rows.map((_, i) => ({ id: i })) }),
            }
          },
        }
        return b
      }
      if (table === 'orca_traces') {
        const b: any = { insert: () => Promise.resolve({ data: null, error: null }) }
        return b
      }
      return builder([])
    },
  }
}

const NOW = () => new Date('2026-06-03T12:00:00Z')

describe('runCheckUserAlerts', () => {
  it('inserts a notification when a price_move rule fires', async () => {
    const sb = makeSupabase({
      profiles: [{ user_id: 'u1', notifications_in_app: true, notification_style: 'balanced' }],
      rules: [{ id: 'r1', user_id: 'u1', ticker: 'SOL', kind: 'price_move', threshold_pct: 5, threshold_usd: null, enabled: true }],
      priceByTicker: { SOL: 9.1 },
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.rules_evaluated).toBe(1)
    expect(res.triggered).toBe(1)
    expect(res.inserted).toBe(1)
    expect(sb.inserted[0]).toMatchObject({ user_id: 'u1', rule_id: 'r1', ticker: 'SOL', kind: 'price_move' })
    expect(sb.inserted[0].dedup_hour).toBe('2026-06-03T12:00:00.000Z')
  })

  it('does not fire below threshold', async () => {
    const sb = makeSupabase({
      profiles: [{ user_id: 'u1', notifications_in_app: true, notification_style: 'balanced' }],
      rules: [{ id: 'r1', user_id: 'u1', ticker: 'SOL', kind: 'price_move', threshold_pct: 20, threshold_usd: null, enabled: true }],
      priceByTicker: { SOL: 3 },
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.triggered).toBe(0)
    expect(res.inserted).toBe(0)
  })

  it('returns early when there are no enabled rules', async () => {
    const sb = makeSupabase({ profiles: [] })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.rules_evaluated).toBe(0)
    expect(res.inserted).toBe(0)
  })

  it('delivers to an owner with no user_profile row at the default cadence', async () => {
    // Most Google sign-ups never got a profile row; notifications_in_app
    // defaults to true, so their alerts must still fire.
    const sb = makeSupabase({
      profiles: [],
      rules: [{ id: 'r1', user_id: 'u-noprofile', ticker: 'SOL', kind: 'price_move', threshold_pct: 5, threshold_usd: null, enabled: true }],
      priceByTicker: { SOL: 9.1 },
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.rules_evaluated).toBe(1)
    expect(res.inserted).toBe(1)
    expect(sb.inserted[0]).toMatchObject({ user_id: 'u-noprofile', rule_id: 'r1' })
  })

  it('skips an owner who switched in-app notifications off', async () => {
    const sb = makeSupabase({
      profiles: [{ user_id: 'u1', notifications_in_app: false, notification_style: 'balanced' }],
      rules: [{ id: 'r1', user_id: 'u1', ticker: 'SOL', kind: 'price_move', threshold_pct: 5, threshold_usd: null, enabled: true }],
      priceByTicker: { SOL: 9.1 },
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.rules_evaluated).toBe(0)
    expect(res.inserted).toBe(0)
    expect(sb.inserted).toHaveLength(0)
  })

  it('caps when the user is already at their daily limit', async () => {
    const sb = makeSupabase({
      profiles: [{ user_id: 'u1', notifications_in_app: true, notification_style: 'quiet' }],
      rules: [{ id: 'r1', user_id: 'u1', ticker: 'SOL', kind: 'price_move', threshold_pct: 5, threshold_usd: null, enabled: true }],
      priceByTicker: { SOL: 9.1 },
      notificationsUsed: 5, // quiet cap is 5
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.triggered).toBe(1)
    expect(res.inserted).toBe(0)
    expect(res.capped).toBe(1)
  })
})
