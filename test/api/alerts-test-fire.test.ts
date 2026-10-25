import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: { user: any; count: number; inserted: any[] } = { user: { id: 'u1' }, count: 0, inserted: [] }

vi.mock('@/app/lib/walletAuth', () => ({ getUserFromRequest: async () => state.user }))
vi.mock('@/app/lib/supabaseAdmin', () => {
  const from = () => {
    const b: any = {
      select: (_c: string, opts?: any) => { b._head = !!opts?.head; return b },
      eq: () => b,
      gte: () => (b._head ? Promise.resolve({ count: state.count }) : b),
      insert: (row: any) => { state.inserted.push(row); return b },
      single: () => Promise.resolve({ data: { id: 7 }, error: null }),
    }
    return b
  }
  return { supabaseAdminFresh: { from } }
})

import { POST } from '@/app/api/personal/alerts/test/route'

const req = () => new Request('http://x/api/personal/alerts/test', { method: 'POST' })

describe('POST /api/personal/alerts/test', () => {
  beforeEach(() => { state.user = { id: 'u1' }; state.count = 0; state.inserted = [] })

  it('inserts one inbox row marked as a test', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(state.inserted).toHaveLength(1)
    expect(state.inserted[0]).toMatchObject({ user_id: 'u1', rule_id: null, title: 'Test alert', payload: { test: true } })
  })

  it('allows 3 tests an hour', async () => {
    state.count = 3
    const res = await POST(req())
    expect(res.status).toBe(429)
    expect(state.inserted).toHaveLength(0)
  })

  it('needs a signed-in user', async () => {
    state.user = null
    expect((await POST(req())).status).toBe(401)
  })
})
