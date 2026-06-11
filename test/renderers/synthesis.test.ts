import { describe, it, expect } from 'vitest'
import { renderSynthesisPrompt } from '@/lib/orca/renderers/synthesis'
import { MANDATORY_DISCLAIMER, HARD_RULES } from '@/lib/orca/shared-rules'
import type { RenderArgs } from '@/lib/orca/renderers/types'
import type { ToolCall, ToolResult } from '@/lib/orca/orchestrator/types'

function mkResult(tool: ToolCall['tool'], args: any, data: any, ok = true): { call: ToolCall; result: ToolResult } {
  return {
    call: { tool, args },
    result: ok
      ? { ok: true, data, source: tool, fetched_at: 't' }
      : { ok: false, data: null, error: 'boom', source: tool, fetched_at: 't' },
  }
}

function mkArgs(over: Partial<RenderArgs> = {}): RenderArgs {
  return { toolResults: [], profile: null, message: 'top whale moves this week', ...over }
}

function disclaimerCount(s: string): number {
  return s.split(MANDATORY_DISCLAIMER).length - 1
}

describe('renderSynthesisPrompt (§6.6)', () => {
  it('embeds the mandatory disclaimer exactly once', () => {
    const out = renderSynthesisPrompt(
      mkArgs({ toolResults: [mkResult('getTrendingWhales', { window: '7d' }, { tokens: [{ ticker: 'BTC', net_usd: 3_000_000 }] })] }),
      'data_query'
    )
    expect(disclaimerCount(out)).toBe(1)
  })

  it('includes the HARD RULES compliance block', () => {
    const out = renderSynthesisPrompt(mkArgs(), 'data_query')
    expect(out).toContain(HARD_RULES)
  })

  it('grounds on the tool results block (tool name + data present)', () => {
    const out = renderSynthesisPrompt(
      mkArgs({ toolResults: [mkResult('getTrendingWhales', { window: '7d' }, { tokens: [{ ticker: 'BTC' }] })] }),
      'data_query'
    )
    expect(out).toContain('tool=getTrendingWhales')
    expect(out).toContain('BTC')
  })

  it('includes the user message', () => {
    const out = renderSynthesisPrompt(mkArgs({ message: 'and how does macro tie in?' }), 'followup')
    expect(out).toContain('and how does macro tie in?')
  })

  it('is intent-aware (followup hint differs from data_query)', () => {
    const fu = renderSynthesisPrompt(mkArgs(), 'followup')
    const dq = renderSynthesisPrompt(mkArgs(), 'data_query')
    expect(fu).toContain('continuation of the prior turn')
    expect(dq).toContain('focused, scannable data answer')
  })

  it('instructs the writer to use ONLY the tool data (no fabrication)', () => {
    const out = renderSynthesisPrompt(mkArgs(), 'data_query')
    expect(out).toMatch(/ONLY the data in the TOOL RESULTS/i)
    expect(out).toMatch(/[Nn]ever invent/)
  })

  it('renders a history block when prior turns are supplied', () => {
    const out = renderSynthesisPrompt(
      mkArgs({ chatHistory: [{ role: 'user', content: 'top whale moves this week' }, { role: 'assistant', content: 'Here is the table…' }] }),
      'followup'
    )
    expect(out).toContain('PRIOR CONVERSATION TURNS')
  })
})
