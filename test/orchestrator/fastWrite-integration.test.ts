/**
 * Integration tests for the v4 fast-write short-circuit in runOrchestrator
 * (§5.1) and the per-tool timeout wrapper (§5.2).
 */
import { describe, it, expect, vi } from 'vitest'
import { runOrchestrator } from '@/lib/orca/orchestrator/runOrchestrator'
import { STANDARD_DISCLAIMER } from '@/lib/orca/orchestrator/guardrails'
import type { ToolCall } from '@/lib/orca/orchestrator/types'

function stubSupabase(opts: { upsert?: () => any } = {}) {
  function builder(_table: string) {
    const chain: any = {
      select() { return chain },
      eq() { return chain },
      gte() { return chain },
      ilike() { return chain },
      or() { return chain },
      order() { return chain },
      limit() { return chain },
      upsert: opts.upsert ?? (() => ({ error: null })),
      delete() { return chain },
      then(resolve: any) { resolve({ data: [] }) },
    }
    return chain
  }
  return { from: builder }
}

const now = () => new Date('2026-06-03T12:00:00Z')

describe('runOrchestrator — fast-write short-circuit (v4 §5.1)', () => {
  it('returns a confirm payload for "add BTC to my watchlist" WITHOUT calling the LLM', async () => {
    const routerCall = vi.fn()
    const writerCall = vi.fn()

    const out = await runOrchestrator(
      { message: 'add BTC to my watchlist', userId: 'u1', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )

    expect(routerCall).not.toHaveBeenCalled()
    expect(writerCall).not.toHaveBeenCalled()
    expect(out.confirm).toBeDefined()
    expect(out.confirm!.label).toBe('Add BTC to watchlist')
    expect(out.confirm!.calls).toHaveLength(1)
    expect(out.confirm!.calls[0].tool).toBe('addToWatchlist')
    expect((out.confirm!.calls[0].args as any).ticker).toBe('BTC')
    expect(out.text).toMatch(/BTC/)
    expect(out.intent).toBe('personal')
  })

  it('does NOT bypass when userConfirmed=true (the second turn must run the planner)', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal',
        tickers: ['BTC'],
        entities: [],
        datapoints: [],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('Added BTC to your watchlist.')
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })

    const confirmedWriteCalls: ToolCall[] = [
      { tool: 'addToWatchlist', args: { ticker: 'BTC' } },
    ]

    const out = await runOrchestrator(
      {
        message: 'Add BTC to watchlist',
        userId: 'u-real-1',
        chatHistory: [],
        profile: null,
        userConfirmed: true,
        confirmedWriteCalls,
      },
      { supabase: stubSupabase({ upsert: upsertSpy }), model: { routerCall, writerCall }, now }
    )

    expect(routerCall).toHaveBeenCalledOnce()
    expect(writerCall).toHaveBeenCalledOnce()
    expect(out.confirm).toBeUndefined()
    expect(out.text).toContain(STANDARD_DISCLAIMER)
    // Verified userId was injected server-side.
    expect(upsertSpy).toHaveBeenCalledOnce()
    const upsertedRow = upsertSpy.mock.calls[0][0]
    expect(upsertedRow.user_id).toBe('u-real-1')
    expect(upsertedRow.ticker).toBe('BTC')
  })

  it('overrides any client-supplied userId on confirmed write calls', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal', tickers: ['SOL'], entities: [], datapoints: [],
        persona_hint: null, confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('Done.')
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })

    await runOrchestrator(
      {
        message: 'Add SOL to watchlist',
        userId: 'real-user',
        chatHistory: [],
        profile: null,
        userConfirmed: true,
        confirmedWriteCalls: [
          { tool: 'addToWatchlist', args: { ticker: 'SOL', userId: 'attacker-injected' } },
        ],
      },
      { supabase: stubSupabase({ upsert: upsertSpy }), model: { routerCall, writerCall }, now }
    )

    expect(upsertSpy.mock.calls[0][0].user_id).toBe('real-user')
  })

  it('does not short-circuit on a read-shaped message', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'data_query', tickers: ['BTC'], entities: [], datapoints: ['price'],
        persona_hint: null, confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('BTC is at $60,000.')

    const out = await runOrchestrator(
      { message: 'what is the BTC price?', userId: 'u1', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    expect(routerCall).toHaveBeenCalledOnce()
    expect(out.confirm).toBeUndefined()
  })
})

describe('runOrchestrator — per-tool timeout (v4 §5.2)', () => {
  it('marks a tool as failed when its registry executor never resolves', async () => {
    // We can't stub executeTool directly here without intercepting the
    // module, so instead we hand the orchestrator a supabase stub whose
    // first .then() never resolves — but the only currently-blocking shape
    // in the read tools is supabase access. Since the existing stub above
    // resolves immediately, we use a hanging upsert to model a hung WRITE.
    //
    // The test asserts that the orchestrator returns control within a
    // bounded time and that the failure surfaces in the trace.
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal', tickers: ['BTC'], entities: [], datapoints: [],
        persona_hint: null, confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('Working on it.')

    // Hanging upsert.
    const hanging = () => new Promise(() => {})
    const sb = stubSupabase({ upsert: hanging as any })

    // Replace the orchestrator's TOOL_TIMEOUT_MS effectively by relying on
    // its default 8s; we keep the test tight by spying on console.error
    // and just asserting the run returns. To keep this fast for CI without
    // poking internals, we run the orchestrator with a confirmed write
    // (the only path that exercises the WRITE tools) and assert the
    // returned promise resolves rather than hanging.
    //
    // Mocha-style fake-timer tricks are forbidden in this codebase
    // (see /memories/repo/orca-redesign-2026-05-24.md), so we instead use a
    // race in the test harness: the orchestrator must return before our
    // outer 10s assertion timeout.
    const out = await runOrchestrator(
      {
        message: 'Add BTC to watchlist',
        userId: 'user-id-long-enough-12345',
        chatHistory: [],
        profile: null,
        userConfirmed: true,
        confirmedWriteCalls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }],
      },
      { supabase: sb, model: { routerCall, writerCall }, now }
    )

    const toolEvents = out.trace.filter((t) => t.stage === 'tool')
    const writeEvent = toolEvents.find((e: any) => e.payload?.tool === 'addToWatchlist')
    expect(writeEvent).toBeDefined()
    expect((writeEvent as any).payload.ok).toBe(false)
    expect((writeEvent as any).payload.source).toBe('timeout')
    expect((writeEvent as any).payload.error).toMatch(/tool_timeout:addToWatchlist/)
  }, 12_000)
})
