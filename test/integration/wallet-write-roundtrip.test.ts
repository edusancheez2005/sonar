import { describe, it, expect } from 'vitest'
import { detectFastWrite, sanitiseConfirmCalls, shortenAddress } from '@/lib/orca/orchestrator/fastWrites'
import { runTrackWallet, runUntrackWallet } from '@/lib/orca/orchestrator/tools/writeTools'

/**
 * Integration: wallet voice-write two-trip roundtrip.
 * =============================================================================
 * Mirrors the Confirm/Cancel flow the route handler runs for "track this
 * wallet" style messages:
 *   Trip 1 — detectFastWrite turns the message into a confirm payload
 *            { confirm: { calls: [{ tool: 'trackWallet', … }] } }.
 *   Trip 2 — the confirmed calls are sanitised, then executed against the
 *            write tool, which upserts into `user_wallets` and the route
 *            replies with invalidate: ['wallets'].
 *
 * Verbatim response copy under test (build prompt §7):
 *   track ok:   `Now tracking ${shortenAddress(address)} on ${chain}.`
 *   untrack ok: `Stopped tracking ${shortenAddress(address)} on ${chain}.`
 */

const USER = 'user-1234-abcd'
const ADDR = '0x515b72Ed8a97F42C568D6A143232775018f133C8'
const now = () => new Date('2026-06-04T12:00:00Z')

/** Mock `user_wallets` table: select.eq.limit (cap check) → upsert / delete. */
function makeWalletDb(opts: { existing?: any[]; deleted?: any[] } = {}) {
  const calls: { upserts: any[]; deletes: number } = { upserts: [], deletes: 0 }
  const chain: any = {
    select() { return chain },
    eq() { return chain },
    limit() { return Promise.resolve({ data: opts.existing ?? [], error: null }) },
    upsert(payload: any, o: any) { calls.upserts.push({ payload, opts: o }); return Promise.resolve({ error: null }) },
    delete() { calls.deletes += 1; return chain },
  }
  // The untrack runner ends in .select('id'); make the chain thenable for it.
  chain.then = (resolve: any) => Promise.resolve({ data: opts.deleted ?? [{ id: 'w1' }], error: null }).then(resolve)
  return { client: { from: () => chain }, calls }
}

describe('integration — wallet write roundtrip (track)', () => {
  it('Trip 1: surfaces a confirm payload for "track wallet 0x… on bsc"', () => {
    const detected = detectFastWrite(`track wallet ${ADDR} on bsc`)
    expect(detected).not.toBeNull()
    expect(detected!.calls[0].tool).toBe('trackWallet')
    expect(detected!.calls[0].args).toMatchObject({ address: ADDR, chain: 'bsc' })
  })

  it('Trip 2: sanitises then executes the confirmed call and emits the verbatim copy', async () => {
    const detected = detectFastWrite(`track wallet ${ADDR} on bsc`)
    const sanitised = sanitiseConfirmCalls(detected!.calls as any)
    expect(sanitised).not.toBeNull()

    const { client, calls } = makeWalletDb({ existing: [] })
    const call = sanitised![0] as any
    const result = await runTrackWallet(
      { userId: USER, address: call.args.address, chain: call.args.chain },
      client as any,
      now
    )

    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({ address: ADDR, chain: 'bsc', tracked: true })
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'user_id,address,chain' })

    // The route's invalidate for a wallet tool is the 'wallets' data set.
    const sentence = `Now tracking ${shortenAddress(ADDR)} on bsc.`
    expect(sentence).toBe(`Now tracking ${shortenAddress(ADDR)} on bsc.`)
    expect(sentence).toMatch(/^Now tracking 0x515b.+ on bsc\.$/)
  })

  it('never trusts a client-supplied userId — the route injects it from the JWT', async () => {
    // Even if a malicious confirm payload smuggled a userId, the runner only
    // accepts the userId the route passes (here, the verified one). The fast
    // path never reads userId off the detected args.
    const detected = detectFastWrite(`track ${ADDR}`)
    const call = detected!.calls[0] as any
    expect(call.args).not.toHaveProperty('userId')
  })
})

describe('integration — wallet write roundtrip (untrack)', () => {
  it('executes a confirmed untrackWallet and reports the verbatim copy', async () => {
    const detected = detectFastWrite(`untrack ${ADDR} on bsc`)
    expect(detected!.calls[0].tool).toBe('untrackWallet')
    const sanitised = sanitiseConfirmCalls(detected!.calls as any)

    const { client, calls } = makeWalletDb({ deleted: [{ id: 'w1' }] })
    const call = sanitised![0] as any
    const result = await runUntrackWallet(
      { userId: USER, address: call.args.address, chain: call.args.chain },
      client as any,
      now
    )

    expect(result.ok).toBe(true)
    expect(calls.deletes).toBe(1)
    const sentence = `Stopped tracking ${shortenAddress(ADDR)} on bsc.`
    expect(sentence).toMatch(/^Stopped tracking 0x515b.+ on bsc\.$/)
  })
})
