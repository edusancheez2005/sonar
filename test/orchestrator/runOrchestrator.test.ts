import { describe, it, expect, vi } from 'vitest'
import { runOrchestrator } from '@/lib/orca/orchestrator/runOrchestrator'
import { COMPLIANCE_DECLINE_RESPONSE, STANDARD_DISCLAIMER } from '@/lib/orca/orchestrator/guardrails'
import type { ToolCall } from '@/lib/orca/orchestrator/types'

function stubSupabase() {
  function builder(_table: string) {
    const chain: any = {
      select() { return chain },
      eq() { return chain },
      gte() { return chain },
      ilike() { return chain },
      or() { return chain },
      order() { return chain },
      limit() { return chain },
      upsert() { return { error: null } },
      delete() { return chain },
      then(resolve: any) { resolve({ data: [] }) },
    }
    return chain
  }
  return { from: builder }
}

const now = () => new Date('2026-05-26T12:00:00Z')

describe('runOrchestrator', () => {
  it('short-circuits on compliance_decline before any tool call', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'compliance_decline',
        tickers: ['BTC'],
        entities: [],
        datapoints: [],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn()
    const out = await runOrchestrator(
      { message: 'should I buy BTC?', userId: 'u1', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    expect(out.text).toBe(COMPLIANCE_DECLINE_RESPONSE)
    expect(out.intent).toBe('compliance_decline')
    expect(writerCall).not.toHaveBeenCalled()
    const stages = out.trace.map((t) => t.stage)
    expect(stages).toContain('router')
    expect(stages).toContain('guardrails')
  })

  it('runs the full pipeline for a data_query and appends the disclaimer', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'data_query',
        tickers: ['BTC'],
        entities: [],
        datapoints: ['price'],
        persona_hint: null,
        confidence: 0.95,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('BTC is at $60,000.')
    const out = await runOrchestrator(
      { message: 'btc price?', userId: 'u1', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    expect(out.text).toContain('BTC is at $60,000.')
    expect(out.text).toContain(STANDARD_DISCLAIMER)
    expect(writerCall).toHaveBeenCalledOnce()
    const toolStages = out.trace.filter((t) => t.stage === 'tool')
    expect(toolStages.length).toBeGreaterThan(0)
  })

  it('redacts userId from the tool trace payload', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal',
        tickers: [],
        entities: [],
        datapoints: ['portfolio'],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('Your watchlist is empty.')
    const out = await runOrchestrator(
      { message: 'what is in my watchlist?', userId: 'user-secret-123', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    const toolPayloads = out.trace.filter((t) => t.stage === 'tool').map((t) => t.payload)
    for (const p of toolPayloads) {
      const args = (p as any).args as Record<string, unknown>
      if (args && 'userId' in args) {
        expect(args.userId).toBe('[redacted]')
      }
    }
  })

  it('falls back to a quiet error when the writer model throws', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'data_query',
        tickers: ['BTC'],
        entities: [],
        datapoints: ['price'],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockRejectedValue(new Error('writer down'))
    const out = await runOrchestrator(
      { message: 'btc?', userId: 'u1', chatHistory: [], profile: null },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    expect(out.text).toContain('could not generate')
    expect(out.text).toContain(STANDARD_DISCLAIMER)
  })

  it('honours confirmedWriteCalls only when userConfirmed is true', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal',
        tickers: [],
        entities: [],
        datapoints: [],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('Added SOL to your watchlist.')
    const calls: ToolCall[] = [{ tool: 'addToWatchlist', args: { userId: 'u1', ticker: 'SOL' } }]
    const out = await runOrchestrator(
      {
        message: 'yes, add it',
        userId: 'u1',
        chatHistory: [],
        profile: null,
        userConfirmed: true,
        confirmedWriteCalls: calls,
      },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    const tools = out.trace.filter((t) => t.stage === 'tool').map((t) => (t.payload as any).tool)
    expect(tools).toContain('addToWatchlist')
  })

  it('ignores confirmedWriteCalls when userConfirmed is false', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'personal',
        tickers: [],
        entities: [],
        datapoints: [],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    const writerCall = vi.fn().mockResolvedValue('ok')
    const calls: ToolCall[] = [{ tool: 'addToWatchlist', args: { userId: 'u1', ticker: 'SOL' } }]
    const out = await runOrchestrator(
      {
        message: 'maybe',
        userId: 'u1',
        chatHistory: [],
        profile: null,
        userConfirmed: false,
        confirmedWriteCalls: calls,
      },
      { supabase: stubSupabase(), model: { routerCall, writerCall }, now }
    )
    const tools = out.trace.filter((t) => t.stage === 'tool').map((t) => (t.payload as any).tool)
    expect(tools).not.toContain('addToWatchlist')
  })
})
