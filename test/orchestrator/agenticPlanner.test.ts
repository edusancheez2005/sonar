import { describe, it, expect, vi } from 'vitest'
import {
  parseAgenticPlan,
  validateCalls,
  compactDigest,
  runAgenticPlan,
  MAX_CALLS_PER_HOP,
} from '@/lib/orca/orchestrator/agenticPlanner'
import type { RouterDecision, TraceEvent } from '@/lib/orca/orchestrator/types'

function stubSupabase() {
  const chain: any = {
    select() { return chain },
    eq() { return chain },
    gte() { return chain },
    ilike() { return chain },
    or() { return chain },
    in() { return chain },
    order() { return chain },
    limit() { return chain },
    maybeSingle() { return Promise.resolve({ data: null }) },
    single() { return Promise.resolve({ data: null }) },
    then(resolve: any) { resolve({ data: [] }) },
  }
  return { from: () => chain }
}
const now = () => new Date('2026-06-10T12:00:00Z')

function router(over: Partial<RouterDecision> = {}): RouterDecision {
  return { intent: 'data_query', tickers: [], entities: [], datapoints: ['whales'], persona_hint: null, confidence: 0.9, ...over }
}

function model(plannerCall: any) {
  return { routerCall: vi.fn(), writerCall: vi.fn(), plannerCall }
}

describe('parseAgenticPlan', () => {
  it('parses a valid plan', () => {
    const p = parseAgenticPlan(JSON.stringify({ thought: 'x', tool_calls: [{ tool: 'getTrendingWhales', args: { window: '7d' } }], done: true }))
    expect(p.done).toBe(true)
    expect(p.tool_calls).toHaveLength(1)
    expect(p.tool_calls[0].tool).toBe('getTrendingWhales')
  })
  it('returns an empty plan on garbage', () => {
    const p = parseAgenticPlan('not json at all')
    expect(p.tool_calls).toEqual([])
    expect(p.done).toBe(false)
  })
  it('strips a ```json fence', () => {
    const p = parseAgenticPlan('```json\n{"thought":"t","tool_calls":[],"done":true}\n```')
    expect(p.done).toBe(true)
  })
  it('ignores malformed tool_calls entries', () => {
    const p = parseAgenticPlan(JSON.stringify({ tool_calls: [{ no_tool: 1 }, 'x', { tool: 'getPrice', args: { ticker: 'BTC' } }] }))
    expect(p.tool_calls).toHaveLength(1)
  })
})

describe('validateCalls', () => {
  it('drops write tools and unknown tools (writes are unrepresentable)', () => {
    const calls = validateCalls([
      { tool: 'addToWatchlist', args: { ticker: 'BTC' } } as any,
      { tool: 'setUserAlert', args: {} } as any,
      { tool: 'notATool', args: {} } as any,
      { tool: 'getTrendingWhales', args: { window: '7d' } },
    ])
    expect(calls.map((c) => c.tool)).toEqual(['getTrendingWhales'])
  })
  it('drops per-ticker tools with no ticker arg', () => {
    expect(validateCalls([{ tool: 'getPrice', args: {} }])).toEqual([])
    expect(validateCalls([{ tool: 'getWhaleFlows', args: { window: '7d' } }])).toEqual([])
  })
  it('uppercases ticker and keeps only catalogue arg keys', () => {
    const calls = validateCalls([{ tool: 'getPrice', args: { ticker: 'btc', bogus: 1 } as any }])
    expect(calls[0].args).toEqual({ ticker: 'BTC' })
  })
  it('caps at MAX_CALLS_PER_HOP', () => {
    const many = Array.from({ length: 10 }, () => ({ tool: 'getTrendingNews', args: {} }))
    expect(validateCalls(many as any).length).toBe(MAX_CALLS_PER_HOP)
  })
})

describe('compactDigest', () => {
  it('summarises results without the full payload', () => {
    const d = compactDigest([
      { call: { tool: 'getTrendingWhales', args: {} }, result: { ok: true, data: { tokens: [{ ticker: 'BTC' }, { ticker: 'ETH' }] }, source: 's', fetched_at: 't' } },
      { call: { tool: 'getPrice', args: { ticker: 'BTC' } }, result: { ok: false, error: 'no_data', source: 's', fetched_at: 't' } },
    ])
    expect(d).toContain('getTrendingWhales')
    expect(d).toContain('BTC')
    expect(d).toContain('no_data')
  })
})

describe('runAgenticPlan', () => {
  it('runs a single hop and stops on done:true', async () => {
    const trace: TraceEvent[] = []
    const plannerCall = vi.fn().mockResolvedValue(
      JSON.stringify({ thought: 'leaderboard', tool_calls: [{ tool: 'getTrendingWhales', args: { window: '7d' } }], done: true })
    )
    const results = await runAgenticPlan(
      { router: router(), profile: null, userId: 'u1', message: 'top whales', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    expect(plannerCall).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.call.tool)).toEqual(['getTrendingWhales'])
    expect(trace.filter((t) => t.stage === 'agentic_plan')).toHaveLength(1)
  })

  it('caps at 2 planning hops', async () => {
    const trace: TraceEvent[] = []
    const plannerCall = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({ thought: 'h1', tool_calls: [{ tool: 'getTrendingWhales', args: { window: '7d' } }], done: false }))
      .mockResolvedValueOnce(JSON.stringify({ thought: 'h2', tool_calls: [{ tool: 'getTrendingSocial', args: {} }], done: false }))
      .mockResolvedValueOnce(JSON.stringify({ thought: 'h3', tool_calls: [{ tool: 'getTrendingNews', args: {} }], done: false }))
    await runAgenticPlan(
      { router: router(), profile: null, userId: 'u1', message: 'm', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    expect(plannerCall).toHaveBeenCalledTimes(2)
  })

  it('dedupes identical calls across hops', async () => {
    const trace: TraceEvent[] = []
    const same = { tool: 'getTrendingWhales', args: { window: '7d' } }
    const plannerCall = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({ thought: 'h1', tool_calls: [same], done: false }))
      .mockResolvedValueOnce(JSON.stringify({ thought: 'h2', tool_calls: [same], done: false }))
    const results = await runAgenticPlan(
      { router: router(), profile: null, userId: 'u1', message: 'm', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    expect(results.filter((r) => r.call.tool === 'getTrendingWhales')).toHaveLength(1)
  })

  it('falls back to the deterministic planner on garbage JSON (still answers)', async () => {
    const trace: TraceEvent[] = []
    const plannerCall = vi.fn().mockResolvedValue('not json')
    const results = await runAgenticPlan(
      { router: router({ datapoints: ['whales'] }), profile: null, userId: 'u1', message: 'top whale moves this week', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    expect(results.map((r) => r.call.tool)).toContain('getTrendingWhales')
    expect(trace.some((t) => t.stage === 'agentic_plan' && (t.payload as any).fallback === 'deterministic')).toBe(true)
  })

  it('falls back when the planner is absent entirely', async () => {
    const trace: TraceEvent[] = []
    const results = await runAgenticPlan(
      { router: router({ datapoints: ['whales'] }), profile: null, userId: 'u1', message: 'top whale moves this week', chatHistory: [] },
      { supabase: stubSupabase(), model: { routerCall: vi.fn(), writerCall: vi.fn() }, now },
      trace
    )
    expect(results.map((r) => r.call.tool)).toContain('getTrendingWhales')
  })

  it('injects the verified userId into user-scoped tools', async () => {
    const trace: TraceEvent[] = []
    const plannerCall = vi.fn().mockResolvedValue(
      JSON.stringify({ thought: 'holdings', tool_calls: [{ tool: 'getUserHoldings', args: {} }], done: true })
    )
    const results = await runAgenticPlan(
      { router: router({ intent: 'personal' }), profile: null, userId: 'user-123', message: 'how am I doing', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    const holdings = results.find((r) => r.call.tool === 'getUserHoldings')
    expect((holdings?.call.args as any).userId).toBe('user-123')
  })

  it('never schedules a write tool even if the planner asks for one', async () => {
    const trace: TraceEvent[] = []
    const plannerCall = vi.fn().mockResolvedValue(
      JSON.stringify({ thought: 'sneaky', tool_calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }, { tool: 'getPrice', args: { ticker: 'BTC' } }], done: true })
    )
    const results = await runAgenticPlan(
      { router: router({ tickers: ['BTC'] }), profile: null, userId: 'u1', message: 'BTC', chatHistory: [] },
      { supabase: stubSupabase(), model: model(plannerCall), now },
      trace
    )
    expect(results.map((r) => r.call.tool)).not.toContain('addToWatchlist')
    expect(results.map((r) => r.call.tool)).toContain('getPrice')
  })
})
