import { describe, it, expect } from 'vitest'
import { runTrackWallet } from '@/lib/orca/orchestrator/tools/writeTools'

const USER = 'user-1234-abcd'
const ADDR = '0x515b72Ed8a97F42C568D6A143232775018f133C8'
const now = () => new Date('2026-06-04T12:00:00Z')

function makeSupabase(opts: { existing?: any[]; countErr?: any; upsertErr?: any } = {}) {
  const calls: { upserts: any[] } = { upserts: [] }
  const chain: any = {
    select() { return chain },
    eq() { return chain },
    limit() { return Promise.resolve({ data: opts.existing ?? [], error: opts.countErr ?? null }) },
    upsert(payload: any, o: any) { calls.upserts.push({ payload, opts: o }); return Promise.resolve({ error: opts.upsertErr ?? null }) },
  }
  return { client: { from: () => chain }, calls }
}

describe('runTrackWallet', () => {
  it('upserts a new wallet (happy path)', async () => {
    const { client, calls } = makeSupabase({ existing: [] })
    const r = await runTrackWallet({ userId: USER, address: ADDR, chain: 'bsc' }, client as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ address: ADDR, chain: 'bsc', tracked: true })
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'user_id,address,chain' })
  })

  it('rejects when the 100-wallet cap is reached', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({ address: `0xother${i}`, chain: 'eth' }))
    const { client, calls } = makeSupabase({ existing })
    const r = await runTrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('wallet_cap_reached')
    expect(calls.upserts).toHaveLength(0)
  })

  it('rejects invalid args without touching the database', async () => {
    const { client, calls } = makeSupabase()
    const r = await runTrackWallet({ userId: 'short', address: ADDR, chain: 'eth' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
    expect(calls.upserts).toHaveLength(0)
  })

  it('returns an error when supabase fails the count query', async () => {
    const { client } = makeSupabase({ countErr: { message: 'boom' } })
    const r = await runTrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, client as any, now)
    expect(r.ok).toBe(false)
  })

  it('rejects a chain that is not in the enum', async () => {
    const { client, calls } = makeSupabase()
    const r = await runTrackWallet({ userId: USER, address: ADDR, chain: 'doge' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
    expect(calls.upserts).toHaveLength(0)
  })

  it('is idempotent — re-tracking an existing wallet at the cap still succeeds', async () => {
    const existing = [
      { address: ADDR, chain: 'eth' },
      ...Array.from({ length: 99 }, (_, i) => ({ address: `0xother${i}`, chain: 'eth' })),
    ]
    const { client, calls } = makeSupabase({ existing })
    const r = await runTrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, client as any, now)
    expect(r.ok).toBe(true)
    expect(calls.upserts).toHaveLength(1)
  })
})
