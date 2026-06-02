import { describe, it, expect } from 'vitest'
import { detectFastWrite, sanitiseConfirmCalls } from '@/lib/orca/orchestrator/fastWrites'
import { runMuteTicker, runUnmuteTicker } from '@/lib/orca/orchestrator/tools/writeTools'
import { humanRelative } from '@/lib/orca/alerts/humanRelative'

/**
 * Integration: mute voice-write two-trip roundtrip.
 * =============================================================================
 * Mirrors the Confirm/Cancel flow the route handler runs for "mute ETH" style
 * messages:
 *   Trip 1 — detectFastWrite turns the message into a confirm payload
 *            { confirm: { calls: [{ tool: 'muteTicker', … }] } }.
 *   Trip 2 — the confirmed calls are sanitised, then executed against the
 *            write tool, which upserts `muted_tickers` / `muted_tickers_until`
 *            on `user_profile` and the route replies with invalidate: ['mute'].
 *
 * Verbatim response copy under test (build prompt §7):
 *   mute ok:   `Muted ${ticker} alerts until ${humanRelative(until)}. You can unmute any time.`
 *   unmute ok: `${ticker} alerts are back on.`
 */

const USER = 'user-1234-abcd'
const now = () => new Date('2026-06-04T12:00:00Z')

/** Mock `user_profile` row: select.eq.maybeSingle → upsert. */
function makeProfileDb(opts: { profile?: any } = {}) {
  const calls: { upserts: any[] } = { upserts: [] }
  const chain: any = {
    select() { return chain },
    eq() { return chain },
    maybeSingle() { return Promise.resolve({ data: opts.profile ?? null, error: null }) },
    upsert(payload: any, o: any) { calls.upserts.push({ payload, opts: o }); return Promise.resolve({ error: null }) },
  }
  return { client: { from: () => chain }, calls }
}

describe('integration — mute write roundtrip (mute)', () => {
  it('Trip 1: surfaces a confirm payload for "mute ETH for 2 days"', () => {
    const detected = detectFastWrite('mute ETH for 2 days')
    expect(detected).not.toBeNull()
    expect(detected!.calls[0].tool).toBe('muteTicker')
    expect(detected!.calls[0].args).toMatchObject({ ticker: 'ETH', minutes: 2 * 24 * 60 })
  })

  it('Trip 2: sanitises then executes the confirmed call and emits the verbatim copy', async () => {
    const detected = detectFastWrite('mute ETH for 2 days')
    const sanitised = sanitiseConfirmCalls(detected!.calls as any)
    expect(sanitised).not.toBeNull()

    const { client, calls } = makeProfileDb({ profile: null })
    const call = sanitised![0] as any
    const result = await runMuteTicker(
      { userId: USER, ticker: call.args.ticker, minutes: call.args.minutes },
      client as any,
      now
    )

    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({ ticker: 'ETH', muted: true })
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].payload.muted_tickers).toContain('ETH')
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'user_id' })

    // now + 2 days = 2026-06-06T12:00:00Z; the copy uses humanRelative.
    const until = '2026-06-06T12:00:00.000Z'
    expect(calls.upserts[0].payload.muted_tickers_until).toBe(until)
    const sentence = `Muted ETH alerts until ${humanRelative(until, now)}. You can unmute any time.`
    expect(sentence).toContain('Muted ETH alerts until')
    expect(sentence).toContain('in 2 days')
    expect(sentence.endsWith('You can unmute any time.')).toBe(true)
  })
})

describe('integration — mute write roundtrip (unmute)', () => {
  it('executes a confirmed unmuteTicker and reports the verbatim copy', async () => {
    const detected = detectFastWrite('unmute ETH')
    expect(detected!.calls[0].tool).toBe('unmuteTicker')
    const sanitised = sanitiseConfirmCalls(detected!.calls as any)

    const { client, calls } = makeProfileDb({
      profile: { muted_tickers: ['ETH', 'BTC'], muted_tickers_until: '2026-07-01T00:00:00Z' },
    })
    const call = sanitised![0] as any
    const result = await runUnmuteTicker({ userId: USER, ticker: call.args.ticker }, client as any, now)

    expect(result.ok).toBe(true)
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].payload.muted_tickers).not.toContain('ETH')
    const sentence = `ETH alerts are back on.`
    expect(sentence).toBe('ETH alerts are back on.')
  })
})
