import { describe, it, expect } from 'vitest'
import { followWallet, unfollowWallets } from '@/lib/wallet/follows'

/** A tiny wallet_follows / user_alerts store with the query shapes the library uses. */
function store(initial: { follows?: any[]; alerts?: any[] } = {}) {
  const db: Record<string, any[]> = { wallet_follows: [...(initial.follows || [])], user_alerts: [...(initial.alerts || [])] }
  const from = (table: string) => {
    const filters: Array<(r: any) => boolean> = []
    let op: 'select' | 'delete' = 'select'
    const b: any = {
      select: () => b,
      delete: () => { op = 'delete'; return b },
      eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return b },
      in: (k: string, vs: any[]) => { filters.push((r) => vs.includes(r[k])); return b },
      limit: () => b,
      upsert: (row: any) => { db[table].push(row); return Promise.resolve({ error: null }) },
      then: (resolve: any) => {
        const hit = db[table].filter((r) => filters.every((f) => f(r)))
        if (op === 'delete') db[table] = db[table].filter((r) => !hit.includes(r))
        return resolve({ data: hit, error: null })
      },
    }
    return b
  }
  return { db, from }
}

const ADDR = '0x28C6c06298d514Db089934071355E5743bf21d60'

describe('followWallet', () => {
  it('stores a new follow in canonical (lower-case) form', async () => {
    const s = store()
    const r = await followWallet(s as any, 'u1', ADDR, 'Binance 14')
    expect(r).toMatchObject({ ok: true, created: true, address: ADDR.toLowerCase() })
    expect(s.db.wallet_follows).toEqual([{ user_id: 'u1', address: ADDR.toLowerCase(), nickname: 'Binance 14' }])
  })
  it('treats another spelling of a followed address as the same follow', async () => {
    const s = store({ follows: [{ user_id: 'u1', address: ADDR.toLowerCase(), nickname: null }] })
    const r = await followWallet(s as any, 'u1', ADDR)
    expect(r).toMatchObject({ ok: true, created: false })
    expect(s.db.wallet_follows).toHaveLength(1)
  })
})

describe('unfollowWallets', () => {
  it('removes the follow and, when asked, its wallet alerts', async () => {
    const s = store({
      follows: [{ user_id: 'u1', address: ADDR.toLowerCase() }, { user_id: 'u2', address: ADDR.toLowerCase() }],
      alerts: [
        { user_id: 'u1', kind: 'wallet_activity', address: ADDR.toLowerCase() },
        { user_id: 'u1', kind: 'price_move', address: null },
      ],
    })
    const r = await unfollowWallets(s as any, 'u1', [ADDR], { removeAlerts: true })
    expect(r).toMatchObject({ ok: true, removed: 1, alertsRemoved: 1 })
    expect(s.db.wallet_follows).toEqual([{ user_id: 'u2', address: ADDR.toLowerCase() }])
    expect(s.db.user_alerts).toEqual([{ user_id: 'u1', kind: 'price_move', address: null }])
  })
})
