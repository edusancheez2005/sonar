import { describe, it, expect } from 'vitest'
import { loadRecentHistory } from '@/lib/orca/chat/loadRecentHistory'

/**
 * Mock supabase query builder. The chain object is thenable so
 * `await supabase.from(...).select(...).eq(...).order(...).limit(...)`
 * resolves to `{ data, error }`. Records the eq() filters applied.
 */
function makeSupabase(result: { data?: any[]; error?: any }) {
  const filters: Array<[string, any]> = []
  const chain: any = {
    select() { return chain },
    eq(col: string, val: any) { filters.push([col, val]); return chain },
    order() { return chain },
    limit() { return chain },
    then(resolve: any, reject: any) {
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)
    },
  }
  const sb = { from: () => chain, _filters: filters }
  return sb
}

describe('loadRecentHistory', () => {
  it('returns [] for a missing userId without querying', async () => {
    const sb = makeSupabase({ data: [] })
    const out = await loadRecentHistory(sb as any, '', 'sess-1')
    expect(out).toEqual([])
    expect((sb as any)._filters).toHaveLength(0)
  })

  it('loads by session_id when provided', async () => {
    const sb = makeSupabase({
      data: [{ user_message: 'hi', orca_response: 'hello', timestamp: '2026-06-01T00:00:00Z' }],
    })
    const out = await loadRecentHistory(sb as any, 'user-1234-abcd', 'sess-9')
    expect((sb as any)._filters).toContainEqual(['session_id', 'sess-9'])
    expect(out.map((t) => t.content)).toEqual(['hi', 'hello'])
  })

  it('falls back to user_id only when session_id is missing', async () => {
    const sb = makeSupabase({
      data: [{ user_message: 'q', orca_response: 'a', timestamp: '2026-06-01T00:00:00Z' }],
    })
    await loadRecentHistory(sb as any, 'user-1234-abcd', null)
    const cols = (sb as any)._filters.map((f: any[]) => f[0])
    expect(cols).toContain('user_id')
    expect(cols).not.toContain('session_id')
  })

  it('unifies both historical column shapes', async () => {
    const sb = makeSupabase({
      data: [
        // newest first (desc); function reverses to chronological
        { question: 'q2', response: 'a2', timestamp: '2026-06-02T00:00:00Z' },
        { user_message: 'q1', orca_response: 'a1', timestamp: '2026-06-01T00:00:00Z' },
      ],
    })
    const out = await loadRecentHistory(sb as any, 'user-1234-abcd', null)
    expect(out.map((t) => t.content)).toEqual(['q1', 'a1', 'q2', 'a2'])
  })

  it('never throws on a supabase error — returns []', async () => {
    const sb = makeSupabase({ error: { message: 'boom' } })
    const out = await loadRecentHistory(sb as any, 'user-1234-abcd', 'sess-1')
    expect(out).toEqual([])
  })

  it('orders turns oldest → newest', async () => {
    const sb = makeSupabase({
      data: [
        { user_message: 'second', timestamp: '2026-06-02T00:00:00Z' },
        { user_message: 'first', timestamp: '2026-06-01T00:00:00Z' },
      ],
    })
    const out = await loadRecentHistory(sb as any, 'user-1234-abcd', null)
    expect(out.map((t) => t.content)).toEqual(['first', 'second'])
  })
})
