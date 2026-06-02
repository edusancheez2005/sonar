import { describe, it, expect } from 'vitest'
import { runUntrackWallet } from '@/lib/orca/orchestrator/tools/writeTools'

const USER = 'user-1234-abcd'
const ADDR = '0x515b72Ed8a97F42C568D6A143232775018f133C8'
const now = () => new Date('2026-06-04T12:00:00Z')

function makeSupabase(opts: { deleted?: any[]; error?: any } = {}) {
  const chain: any = {
    delete() { return chain },
    eq() { return chain },
    select() { return Promise.resolve({ data: opts.deleted ?? [], error: opts.error ?? null }) },
  }
  return { from: () => chain }
}

describe('runUntrackWallet', () => {
  it('removes a tracked wallet', async () => {
    const sb = makeSupabase({ deleted: [{ id: 'row-1' }] })
    const r = await runUntrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, sb as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ removed: true })
  })

  it('reports not_tracked when nothing was deleted', async () => {
    const sb = makeSupabase({ deleted: [] })
    const r = await runUntrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, sb as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ removed: false, reason: 'not_tracked' })
  })

  it('rejects invalid args', async () => {
    const sb = makeSupabase()
    const r = await runUntrackWallet({ userId: 'short', address: ADDR, chain: 'eth' }, sb as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })

  it('returns an error on a supabase failure', async () => {
    const sb = makeSupabase({ error: { message: 'boom' } })
    const r = await runUntrackWallet({ userId: USER, address: ADDR, chain: 'eth' }, sb as any, now)
    expect(r.ok).toBe(false)
  })
})
