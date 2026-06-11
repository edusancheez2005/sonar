import { describe, it, expect } from 'vitest'
import { renderFollowupPrompt } from '@/lib/orca/renderers/followup'
import { MANDATORY_DISCLAIMER } from '@/lib/orca/shared-rules'
import type { RenderArgs } from '@/lib/orca/renderers/types'
import type { ToolCall, ToolResult } from '@/lib/orca/orchestrator/types'

function mkResult(tool: ToolCall['tool'], args: any, data: any): { call: ToolCall; result: ToolResult } {
  return { call: { tool, args }, result: { ok: true, data, source: tool, fetched_at: 't' } }
}
function mkArgs(over: Partial<RenderArgs> = {}): RenderArgs {
  return { toolResults: [], profile: null, message: 'so most of them had loads of sells right?', ...over }
}
function disclaimerCount(s: string): number {
  return s.split(MANDATORY_DISCLAIMER).length - 1
}

describe('renderFollowupPrompt — whale carry-over (§4.3)', () => {
  it('adds the market-wide whale-table carry instruction for getTrendingWhales', () => {
    const out = renderFollowupPrompt(
      mkArgs({ toolResults: [mkResult('getTrendingWhales', { window: '7d' }, { tokens: [{ ticker: 'BTC', buy_count: 502, sell_count: 236 }] })] })
    )
    expect(out).toContain('follow-up to a market-wide whale-flow table')
    expect(out).toMatch(/Do NOT ask which token/i)
  })

  it('adds the per-ticker drill instruction for getWhaleFlows', () => {
    const out = renderFollowupPrompt(
      mkArgs({ message: 'just BTC', toolResults: [mkResult('getWhaleFlows', { ticker: 'BTC' }, { net_usd: 3_000_000 })] })
    )
    expect(out).toMatch(/drilled into a specific token/i)
  })

  it('grounds on the whale rows and keeps a single disclaimer', () => {
    const out = renderFollowupPrompt(
      mkArgs({ toolResults: [mkResult('getTrendingWhales', { window: '7d' }, { tokens: [{ ticker: 'WETH', buy_count: 6, sell_count: 50 }] })] })
    )
    expect(out).toContain('tool=getTrendingWhales')
    expect(out).toContain('WETH')
    expect(disclaimerCount(out)).toBe(1)
  })
})
