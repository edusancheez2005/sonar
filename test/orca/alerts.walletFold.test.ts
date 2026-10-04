import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn() },
  supabaseAdminFresh: vi.fn(() => ({ from: vi.fn() })),
}))

import {
  runCheckUserAlerts,
  walletAlertToRule,
  mergeWalletAlertRows,
  effectiveWalletThreshold,
  LARGE_TX_DEFAULT_USD,
} from '@/lib/orca/alerts/runCheckUserAlerts'
import { evaluateWalletActivity, addressVariants, DEFAULT_WALLET_MIN_USD } from '@/lib/orca/alerts/evaluators'
import { transferUsd, _resetNativePriceCache } from '@/lib/wallet/transferValue'

const NOW = () => new Date('2026-10-03T12:00:00Z')
const EVM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const EVM_LOWER = EVM.toLowerCase()
const SOL = 'DYAn4XpAkN5mhiXkRB7dGq4Jadnx6XYgu8L5b3WGhbrt'

beforeEach(() => _resetNativePriceCache())

describe('walletAlertToRule / thresholds', () => {
  it('normalises EVM addresses to lower case and leaves chain null (EVM is chain-agnostic)', () => {
    const r = walletAlertToRule({ user_id: 'u1', address: EVM, chain: 'base', alert_type: 'any_activity', min_usd_value: 2500.4, is_active: true })
    expect(r).toEqual({
      user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null,
      threshold_usd: 2500, address: EVM_LOWER, chain: null, enabled: true,
    })
  })
  it('keeps Solana addresses exact and tags them solana', () => {
    const r = walletAlertToRule({ user_id: 'u1', address: SOL, chain: null, alert_type: 'any_activity' })
    expect(r!.address).toBe(SOL)
    expect(r!.chain).toBe('solana')
  })
  it('gives a "large transaction" alert saved without a minimum the default floor', () => {
    expect(effectiveWalletThreshold({ alert_type: 'large_transaction', min_usd_value: null })).toBe(LARGE_TX_DEFAULT_USD)
    expect(effectiveWalletThreshold({ alert_type: 'large_transaction', min_usd_value: 5_000_000 })).toBe(5_000_000)
    expect(effectiveWalletThreshold({ alert_type: 'any_activity', min_usd_value: 0 })).toBeNull()
    expect(effectiveWalletThreshold({ alert_type: 'token_transfer', min_usd_value: null })).toBeNull()
  })
  it('drops undeliverable or malformed rows', () => {
    expect(walletAlertToRule({ user_id: null, address: EVM })).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: '' })).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: EVM, is_active: false })).toBeNull()
    expect(walletAlertToRule({ user_id: 'u1', address: 'x,usd_value.gt.0' })).toBeNull()
  })
  it('merges several rows on one address into the most permissive rule', () => {
    const rules = mergeWalletAlertRows([
      { user_id: 'u1', address: EVM, alert_type: 'large_transaction', min_usd_value: null },
      { user_id: 'u1', address: EVM_LOWER, alert_type: 'large_transaction', min_usd_value: 20_000 },
      { user_id: 'u2', address: EVM, alert_type: 'large_transaction', min_usd_value: 20_000 },
      { user_id: 'u2', address: EVM, alert_type: 'any_activity', min_usd_value: null },
    ])
    expect(rules).toHaveLength(2)
    expect(rules.find((r) => r.user_id === 'u1')!.threshold_usd).toBe(20_000)
    expect(rules.find((r) => r.user_id === 'u2')!.threshold_usd).toBeNull()
  })
})

describe('transferUsd', () => {
  const prices = { ETH: 2700, SOL: 120, POL: 0.1, BNB: 790 }
  it('uses amount_usd when the poller set it', () => {
    expect(transferUsd({ chain: 'ethereum', contract: '0xabc', amount: 1, amount_usd: 42 }, prices)).toBe(42)
  })
  it('prices native coins from the latest snapshot', () => {
    expect(transferUsd({ chain: 'ethereum', contract: '', amount: 500, amount_usd: null }, prices)).toBe(1_350_000)
    expect(transferUsd({ chain: 'solana', contract: '', amount: 10, amount_usd: null }, prices)).toBe(1200)
  })
  it('values allowlisted stablecoin contracts at $1, never by symbol', () => {
    expect(transferUsd({ chain: 'ethereum', contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', amount: 1_000_000 }, prices)).toBe(1_000_000)
    expect(transferUsd({ chain: 'ethereum', contract: '0x0000000000000000000000000000000000000bad', amount: 1_000_000 }, prices)).toBeNull()
  })
  it('leaves spam and unpriced chains unvalued', () => {
    expect(transferUsd({ chain: 'ethereum', contract: '0xspam', amount: null, amount_usd: null }, prices)).toBeNull()
    expect(transferUsd({ chain: 'tron', contract: '', amount: 5 }, prices)).toBeNull()
  })
})

describe('addressVariants', () => {
  it('covers as-given, lower-case and EIP-55 spellings', () => {
    const v = addressVariants(EVM_LOWER)
    expect(v).toContain(EVM_LOWER)
    expect(v).toContain(EVM) // checksummed form, which the tracked-address poller stores
    expect(addressVariants(SOL)).toEqual([SOL])
  })
})

/** Table-aware mock for the full run: fold, evaluate, dedup, insert. */
function makeSupabase(opts: {
  walletAlerts?: any[]
  existingRules?: any[]
  enabledRules?: any[]
  transfers?: any[]
  tape?: any[]
  recentNotifications?: any[]
  curated?: any[]
}) {
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
      if (table === 'wallet_alerts') return builder(opts.walletAlerts ?? [])
      if (table === 'user_alerts') {
        // .eq('enabled', true) → enabled rules; .eq('kind', 'wallet_activity') → existing wallet rules
        let mode: 'enabled' | 'wallet' = 'enabled'
        const b: any = builder([], {
          eq: (col: string) => { if (col === 'kind') mode = 'wallet'; return b },
          limit: () => Promise.resolve({ data: mode === 'wallet' ? (opts.existingRules ?? []) : (opts.enabledRules ?? opts.existingRules ?? []) }),
          insert: (row: any) => {
            insertedRules.push(row)
            const created = { id: `rule-${insertedRules.length}`, ...row }
            return { select: () => Promise.resolve({ data: [created] }) }
          },
        })
        return b
      }
      if (table === 'tracked_address_transfers') return builder(opts.transfers ?? [])
      if (table === 'all_whale_transactions') return builder(opts.tape ?? [])
      if (table === 'price_snapshots') return builder([{ price_usd: 2700, timestamp: '2026-10-03T11:55:00Z' }])
      if (table === 'curated_entities') return builder(opts.curated ?? [])
      if (table === 'user_notifications') {
        return builder(opts.recentNotifications ?? [], {
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

describe('runCheckUserAlerts — wallet_alerts fold + wallet dedup', () => {
  it('folds an owned wallet_alert and evaluates it in the same run, pricing native ETH', async () => {
    const sb = makeSupabase({
      walletAlerts: [
        { id: 'wa1', user_id: 'u1', address: EVM, chain: 'ethereum', alert_type: 'any_activity', min_usd_value: null, is_active: true },
        { id: 'wa2', user_id: null, address: '0x1234567890abcdef1234567890abcdef12345678', alert_type: 'any_activity', is_active: true }, // unowned → skipped
      ],
      transfers: [{ tx_hash: '0xH1', chain: 'ethereum', contract: '', amount: 100, amount_usd: null, token_symbol: 'ETH' }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.folded_wallet_alerts).toBe(1)
    expect(sb.insertedRules[0]).toMatchObject({ user_id: 'u1', kind: 'wallet_activity', address: EVM_LOWER, chain: null })
    expect(res.triggered).toBe(1)
    expect(res.inserted).toBe(1)
    expect(sb.notifications[0]).toMatchObject({ user_id: 'u1', rule_id: 'rule-1', kind: 'wallet_activity' })
    expect(sb.notifications[0].payload.raw.txHashes).toEqual(['0xh1'])
    expect(sb.notifications[0].payload.raw.totalUsd).toBe(270_000)
  })

  it('does not fold over an existing rule for the same address (any case)', async () => {
    const sb = makeSupabase({
      walletAlerts: [{ id: 'wa1', user_id: 'u1', address: EVM, alert_type: 'any_activity', is_active: true }],
      existingRules: [{ id: 'r1', user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null, threshold_usd: null, address: EVM_LOWER, chain: null, enabled: true }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.folded_wallet_alerts).toBe(0)
    expect(sb.insertedRules).toHaveLength(0)
  })

  it('names the entity and only notifies transactions it has not notified before', async () => {
    const rule = { id: 'r1', user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null, threshold_usd: null, address: EVM_LOWER, chain: null, enabled: true }
    const sb = makeSupabase({
      existingRules: [rule],
      tape: [
        { transaction_hash: '0xOLD', usd_value: 1_000_000, token_symbol: 'USDT' },
        { transaction_hash: '0xNEW', usd_value: 80_000_000, token_symbol: 'USDC' },
      ],
      recentNotifications: [
        { rule_id: 'r1', kind: 'wallet_activity', title: 'Vitalik Buterin moved $1.0M (USDT)', payload: { raw: { txHashes: ['0xold'] } }, created_at: '2026-10-03T10:00:00Z' },
      ],
      curated: [{ display_name: 'Vitalik Buterin', addresses: [{ chain: 'ethereum', address: EVM }] }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.inserted).toBe(1)
    const n = sb.notifications[0]
    expect(n.title).toMatch(/^Vitalik Buterin moved \$80\.0+M \(USDC\)$/)
    expect(n.payload.raw.txHashes).toEqual(['0xnew'])
    expect(n.payload.raw.totalUsd).toBe(80_000_000)
  })

  it('stays quiet when every transaction was already notified', async () => {
    const rule = { id: 'r1', user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null, threshold_usd: null, address: EVM_LOWER, chain: null, enabled: true }
    const sb = makeSupabase({
      existingRules: [rule],
      tape: [{ transaction_hash: '0xOLD', usd_value: 1_000_000, token_symbol: 'USDT' }],
      recentNotifications: [
        { rule_id: 'r1', kind: 'wallet_activity', title: 'x', payload: { raw: { txHashes: ['0xold'] } }, created_at: '2026-10-03T10:00:00Z' },
      ],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.triggered).toBe(1)
    expect(res.inserted).toBe(0)
    expect(sb.notifications).toHaveLength(0)
  })
})

describe('evaluateWalletActivity — sources and filters', () => {
  function sb(byTable: Record<string, any[]>) {
    return {
      from(table: string) {
        const rows = byTable[table] ?? (table === 'price_snapshots' ? [{ price_usd: 2700, timestamp: 'x' }] : [])
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
    const c = await evaluateWalletActivity(EVM, null, null, sb({
      tracked_address_transfers: [{ tx_hash: '0x1', chain: 'ethereum', contract: '0xtoken', amount: 10, amount_usd: 50_000, token_symbol: 'LINK' }],
    }) as any, NOW)
    expect(c).not.toBeNull()
    expect((c!.payload.raw as any).txCount).toBe(1)
    expect((c!.payload.raw as any).topToken).toBe('LINK')
  })
  it('ignores airdrop spam with no value and dust below the default floor', async () => {
    const c = await evaluateWalletActivity(EVM, null, null, sb({
      tracked_address_transfers: [
        { tx_hash: '0x1', chain: 'ethereum', contract: '0xspam', amount: null, amount_usd: null, token_symbol: 'ODYSSEY' },
        { tx_hash: '0x2', chain: 'ethereum', contract: '0xtoken', amount: 1, amount_usd: DEFAULT_WALLET_MIN_USD - 1, token_symbol: 'X' },
      ],
    }) as any, NOW)
    expect(c).toBeNull()
  })
  it('counts the same transaction once when two sources return it', async () => {
    const c = await evaluateWalletActivity(EVM, null, null, sb({
      all_whale_transactions: [{ transaction_hash: '0xSAME', usd_value: 1_000_000, token_symbol: 'USDT' }],
      tracked_address_transfers: [{ tx_hash: '0xsame', chain: 'ethereum', contract: '', amount: 1, amount_usd: 1_000_000, token_symbol: 'USDT' }],
    }) as any, NOW)
    expect((c!.payload.raw as any).txCount).toBe(1)
    expect((c!.payload.raw as any).totalUsd).toBe(1_000_000)
  })
})

describe('runCheckUserAlerts — wallet noise guards', () => {
  const ruleA = { id: 'rA', user_id: 'u1', ticker: null, kind: 'wallet_activity', threshold_pct: null, threshold_usd: null, address: EVM_LOWER, chain: null, enabled: true }
  const ruleB = { ...ruleA, id: 'rB', address: '0x1234567890abcdef1234567890abcdef12345678' }
  it('notifies a transaction once even when two followed addresses see it', async () => {
    const sb = makeSupabase({
      existingRules: [ruleA, ruleB],
      tape: [{ transaction_hash: '0xSHARED', usd_value: 3_000_000, token_symbol: 'USDT' }],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.triggered).toBe(2)
    expect(res.inserted).toBe(1)
  })
  it('stops a busy wallet after its daily allowance', async () => {
    const today = (i: number) => ({ rule_id: 'rA', kind: 'wallet_activity', title: 't', payload: { raw: { txHashes: [`0xold${i}`] } }, created_at: `2026-10-03T0${i}:00:00Z` })
    const sb = makeSupabase({
      existingRules: [ruleA],
      tape: [{ transaction_hash: '0xFRESH', usd_value: 3_000_000, token_symbol: 'USDT' }],
      recentNotifications: [today(1), today(2), today(3)],
    })
    const res = await runCheckUserAlerts(sb as any, { now: NOW })
    expect(res.inserted).toBe(0)
  })
})
