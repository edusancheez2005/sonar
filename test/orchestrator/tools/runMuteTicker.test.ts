import { describe, it, expect } from 'vitest'
import { runMuteTicker } from '@/lib/orca/orchestrator/tools/writeTools'

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

describe('runMuteTicker', () => {
  it('mutes a ticker for the requested duration (happy path)', async () => {
    const { client, calls } = makeSupabase({ profile: null })
    const r = await runMuteTicker({ userId: USER, ticker: 'BTC', minutes: 1440 }, client as any, now)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({ ticker: 'BTC', muted: true })
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].payload.muted_tickers).toContain('BTC')
    // now + 1440 min = 2026-06-05T12:00:00Z
    expect(calls.upserts[0].payload.muted_tickers_until).toBe('2026-06-05T12:00:00.000Z')
  })

  it('rejects when the 50-ticker cap is reached', async () => {
    const muted_tickers = Array.from({ length: 50 }, (_, i) => `T${i}`)
    const { client, calls } = makeSupabase({
      profile: { muted_tickers, muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const r = await runMuteTicker({ userId: USER, ticker: 'BTC', minutes: 60 }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('mute_cap_reached')
    expect(calls.upserts).toHaveLength(0)
  })

  it('rejects invalid args', async () => {
    const { client, calls } = makeSupabase()
    const r = await runMuteTicker({ userId: 'short', ticker: 'BTC' }, client as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid_args')
    expect(calls.upserts).toHaveLength(0)
  })

  it('returns an error when the profile load fails', async () => {
    const { client } = makeSupabase({ loadErr: { message: 'boom' } })
    const r = await runMuteTicker({ userId: USER, ticker: 'BTC', minutes: 60 }, client as any, now)
    expect(r.ok).toBe(false)
  })

  it('keeps the later of the existing and the new expiry', async () => {
    const farFuture = '2026-12-31T00:00:00Z'
    const { client, calls } = makeSupabase({
      profile: { muted_tickers: ['ETH'], muted_tickers_until: farFuture },
    })
    const r = await runMuteTicker({ userId: USER, ticker: 'BTC', minutes: 60 }, client as any, now)
    expect(r.ok).toBe(true)
    expect(calls.upserts[0].payload.muted_tickers_until).toBe(new Date(farFuture).toISOString())
  })

  it('re-muting an existing ticker at the cap still succeeds', async () => {
    const muted_tickers = ['BTC', ...Array.from({ length: 49 }, (_, i) => `T${i}`)]
    const { client, calls } = makeSupabase({
      profile: { muted_tickers, muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const r = await runMuteTicker({ userId: USER, ticker: 'BTC', minutes: 60 }, client as any, now)
    expect(r.ok).toBe(true)
    expect(calls.upserts).toHaveLength(1)
  })
})
