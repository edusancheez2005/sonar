import { describe, it, expect, vi } from 'vitest'

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
  supabaseAdminFresh: vi.fn(() => ({ from: vi.fn() })),
}))

import { runCheckUserAlerts } from '@/app/api/cron/check-user-alerts/route'

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
        // Resolve to a single row keyed by the ticker the cron is asking about.
        // The eq() arg is swallowed, so return the only configured ticker.
        const vals = Object.values(config.priceByTicker ?? {})
        return builder(vals.length ? [{ price_change_24h: vals[0] }] : [])
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

  it('returns early when no profiles have in-app enabled', async () => {
    const sb = makeSupabase({ profiles: [] })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.rules_evaluated).toBe(0)
    expect(res.inserted).toBe(0)
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
