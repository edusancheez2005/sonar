import { describe, it, expect } from 'vitest'
import { runUnmuteTicker } from '@/lib/orca/orchestrator/tools/writeTools'

const USER = 'user-1234-abcd'
const now = () => new Date('2026-06-04T12:00:00Z')

function makeSupabase(opts: { profile?: any; loadErr?: any; upsertErr?: any } = {}) {
  const calls: { upserts: any[] } = { upserts: [] }
  const chain: any = {
    select() { return chain },
    eq() { return chain },
    maybeSingle() { return Promise.resolve({ data: opts.profile ?? null, error: opts.loadErr ?? null }) },
    upsert(payload: any, o: any) { calls.upserts.push({ payload, opts: o }); return Promise.resolve({ error: opts.upsertErr ?? null }) },
  }
  return { client: { from: () => chain }, calls }
}

describe('runUnmuteTicker', () => {
  it('unmutes a muted ticker', async () => {
    const { client, calls } = makeSupabase({
      profile: { muted_tickers: ['BTC', 'ETH'], muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const r = await runUnmuteTicker({ userId: USER, ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ ticker: 'BTC', unmuted: true })
    expect(calls.upserts[0].payload.muted_tickers).toEqual(['ETH'])
  })

  it('clears the expiry when the last ticker is unmuted', async () => {
    const { client, calls } = makeSupabase({
      profile: { muted_tickers: ['BTC'], muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const r = await runUnmuteTicker({ userId: USER, ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(true)
    expect(calls.upserts[0].payload.muted_tickers_until).toBeNull()
  })

  it('reports not_muted when the ticker was not muted', async () => {
    const { client, calls } = makeSupabase({
      profile: { muted_tickers: ['ETH'], muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const r = await runUnmuteTicker({ userId: USER, ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ unmuted: false, reason: 'not_muted' })
    expect(calls.upserts).toHaveLength(0)
  })

  it('rejects invalid args', async () => {
    const { client } = makeSupabase()
    const r = await runUnmuteTicker({ userId: 'short', ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
  })
})
