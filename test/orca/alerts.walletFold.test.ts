import { describe, it, expect, vi } from 'vitest'

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
  supabaseAdminFresh: vi.fn(() => ({ from: vi.fn() })),
}))

import { runCheckUserAlerts, walletAlertToRule } from '@/lib/orca/alerts/runCheckUserAlerts'
import { evaluateWalletActivity } from '@/lib/orca/alerts/evaluators'

const NOW = () => new Date('2026-10-03T12:00:00Z')

describe('walletAlertToRule', () => {
  it('maps an owned active wallet_alerts row to a wallet_activity rule', () => {
    const r = walletAlertToRule({ user_id: 'u1', address: '0xAbC', chain: 'ethereum', min_usd_value: 2500.4, is_active: true })
    expect(r).toEqual({
      user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null,
      threshold_usd: 2500, address: '0xAbC', chain: 'ethereum', enabled: true,
    })
  })
  it('treats 0 / null / 1 min_usd as "any valued movement" and drops undeliverable rows', () => {
    expect(walletAlertToRule({ user_id: 'u1', address: '0x1', min_usd_value: 0 })!.threshold_usd).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: '0x1', min_usd_value: null })!.threshold_usd).toBeNull()
    expect(walletAlertToRule({ user_id: null, address: '0x1' })).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: '' })).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: '0x1', is_active: false })).toBeNull()
  })
})

/** Table-aware mock: wallet_alerts rows fold into user_alerts, and the folded
 *  rule is evaluated in the same run (tracked_address_transfers has a move). */
function makeSupabase(opts: { walletAlerts: any[]; existingRules?: any[]; transfers?: any[] }) {
  const insertedRules: any[] = []
  const notifications: any[] = []
  function builder(rows: any[], extra: Record<string, any> = {}) {
    const b: any = {
      select: () => b, eq: () => b, gte: () => b, gt: () => b, in: () => b, or: () => b, is: () => b,
      order: () => b,
      limit: () => Promise.resolve({ data: rows }),
      then: (resolve: any) => resolve({ data: rows }),
      ...extra,
    }
    return b
  }
  return {
    insertedRules,
    notifications,
    from(table: string) {
      if (table === 'user_profile') return builder([{ user_id: 'u1', notifications_in_app: true, notification_style: 'balanced' }])
      if (table === 'wallet_alerts') return builder(opts.walletAlerts)
      if (table === 'user_alerts') {
        return builder(opts.existingRules ?? [], {
          insert: (row: any) => {
            insertedRules.push(row)
            const created = { id: `rule-${insertedRules.length}`, ...row }
            return { select: () => Promise.resolve({ data: [created] }) }
          },
        })
      }
      if (table === 'tracked_address_transfers') return builder(opts.transfers ?? [])
      if (table === 'user_notifications') {
        return builder([], {
          upsert: (rows: any[]) => {
            notifications.push(...rows)
            return { select: () => Promise.resolve({ data: rows.map((_, i) => ({ id: i })) }) }
          },
        })
      }
      if (table === 'orca_traces') return { insert: () => Promise.resolve({ data: null, error: null }) }
      return builder([])
    },
  }
}

describe('runCheckUserAlerts — wallet_alerts fold', () => {
  it('creates a wallet_activity rule for an owned wallet_alert and evaluates it in the same run', async () => {
    const sb = makeSupabase({
      walletAlerts: [
        { id: 'wa1', user_id: 'u1', address: '0xabc', chain: 'ethereum', alert_type: 'large_transaction', min_usd_value: null, is_active: true },
        { id: 'wa2', user_id: null, address: '0xdead', chain: 'ethereum', alert_type: 'any_activity', min_usd_value: 1, is_active: true }, // unowned → skipped
      ],
      transfers: [{ tx_hash: '0xh1', amount_usd: 125_000, token_symbol: 'USDC', chain: 'ethereum' }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.folded_wallet_alerts).toBe(1)
    expect(sb.insertedRules).toHaveLength(1)
    expect(sb.insertedRules[0]).toMatchObject({ user_id: 'u1', kind: 'wallet_activity', address: '0xabc', enabled: true })
    expect(res.rules_evaluated).toBe(1)
    expect(res.triggered).toBe(1)
    expect(sb.notifications[0]).toMatchObject({ user_id: 'u1', rule_id: 'rule-1', kind: 'wallet_activity' })
  })
  it('does not duplicate a rule the user already has for that address', async () => {
    const sb = makeSupabase({
      walletAlerts: [{ id: 'wa1', user_id: 'u1', address: '0xABC', chain: 'ethereum', min_usd_value: null, is_active: true }],
      existingRules: [{ id: 'r1', user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null, threshold_usd: null, address: '0xabc', chain: 'ethereum', enabled: true }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.folded_wallet_alerts).toBe(0)
    expect(sb.insertedRules).toHaveLength(0)
    expect(res.rules_evaluated).toBe(1)
  })
})

describe('evaluateWalletActivity — tracked transfers + spam filter', () => {
  function sb(byTable: Record<string, any[]>) {
    return {
      from(table: string) {
        const rows = byTable[table] ?? []
        const b: any = {
          select: () => b, eq: () => b, gte: () => b, in: () => b, or: () => b, order: () => b,
          limit: () => Promise.resolve({ data: rows }),
          then: (resolve: any) => resolve({ data: rows }),
        }
        return b
      },
    }
  }
  it('fires on a valued tracked transfer even when the whale tape is empty', async () => {
    const c = await evaluateWalletActivity('0xabc', null, 'ethereum', sb({
      tracked_address_transfers: [{ tx_hash: '0x1', amount_usd: 50_000, token_symbol: 'ETH' }],
    }) as any, NOW)
    expect(c).not.toBeNull()
    expect((c!.payload.raw as any).txCount).toBe(1)
    expect((c!.payload.raw as any).topToken).toBe('ETH')
  })
  it('ignores airdrop dust with no USD value (the ODYSSEY spray)', async () => {
    const c = await evaluateWalletActivity('0xabc', null, 'ethereum', sb({
      tracked_address_transfers: [
        { tx_hash: '0x1', amount_usd: null, token_symbol: 'ODYSSEY' },
        { tx_hash: '0x2', amount_usd: 0, token_symbol: 'ODYSSEY' },
      ],
    }) as any, NOW)
    expect(c).toBeNull()
  })
  it('counts the same transaction once when two sources return it', async () => {
    const c = await evaluateWalletActivity('0xabc', null, null, sb({
      all_whale_transactions: [{ transaction_hash: '0xSAME', usd_value: 1_000_000, token_symbol: 'USDT' }],
      tracked_address_transfers: [{ tx_hash: '0xsame', amount_usd: 1_000_000, token_symbol: 'USDT' }],
    }) as any, NOW)
    expect((c!.payload.raw as any).txCount).toBe(1)
    expect((c!.payload.raw as any).totalUsd).toBe(1_000_000)
  })
})
