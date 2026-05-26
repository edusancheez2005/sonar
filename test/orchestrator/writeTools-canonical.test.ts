import { describe, it, expect } from 'vitest'
import {
  runAddToWatchlist,
  runRemoveFromWatchlist,
} from '@/lib/orca/orchestrator/tools/writeTools'

/**
 * Stage B.1 unification regression tests.
 *
 * These tests pin the canonical watchlist table (`user_watchlists` plural,
 * column `symbol`) so a future refactor cannot silently regress to the
 * orphan singular table again.
 */

interface RecordedCall {
  table: string
  op: 'upsert' | 'delete'
  payload?: any
  opts?: any
  filters?: Array<[string, any]>
}

function recordingSupabase() {
  const calls: RecordedCall[] = []
  function from(table: string) {
    const filters: Array<[string, any]> = []
    const chain: any = {
      upsert(payload: any, opts: any) {
        calls.push({ table, op: 'upsert', payload, opts })
        return Promise.resolve({ error: null })
      },
      delete() {
        chain._delete = true
        return chain
      },
      eq(col: string, val: any) {
        filters.push([col, val])
        if (chain._delete) {
          // resolve on the second .eq (user_id, then symbol)
          if (filters.length === 2) {
            calls.push({ table, op: 'delete', filters: filters.slice() })
            return Promise.resolve({ error: null })
          }
        }
        return chain
      },
    }
    return chain
  }
  return { client: { from }, calls }
}

const now = () => new Date('2026-05-26T12:00:00Z')

describe('runAddToWatchlist (Stage B.1 canonical table)', () => {
  it('upserts into user_watchlists with symbol column and composite conflict key', async () => {
    const { client, calls } = recordingSupabase()
    const r = await runAddToWatchlist(
      { userId: 'user-1234-abcd', ticker: 'sol' },
      client as any,
      now
    )
    expect(r.ok).toBe(true)
    expect(r.source).toBe('user_watchlists')
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('user_watchlists')
    expect(calls[0].op).toBe('upsert')
    expect(calls[0].payload).toEqual({ user_id: 'user-1234-abcd', symbol: 'SOL' })
    expect(calls[0].opts).toEqual({ onConflict: 'user_id,symbol' })
  })

  it('rejects invalid args without touching the database', async () => {
    const { client, calls } = recordingSupabase()
    const r = await runAddToWatchlist({ userId: 'short', ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
    expect(calls).toHaveLength(0)
  })
})

describe('runRemoveFromWatchlist (Stage B.1 canonical table)', () => {
  it('deletes from user_watchlists filtering by user_id and symbol', async () => {
    const { client, calls } = recordingSupabase()
    const r = await runRemoveFromWatchlist(
      { userId: 'user-1234-abcd', ticker: 'eth' },
      client as any,
      now
    )
    expect(r.ok).toBe(true)
    expect(r.source).toBe('user_watchlists')
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('user_watchlists')
    expect(calls[0].op).toBe('delete')
    expect(calls[0].filters).toEqual([
      ['user_id', 'user-1234-abcd'],
      ['symbol', 'ETH'],
    ])
  })
})
