import { describe, expect, it } from 'vitest'
import {
  renderWalletLookupPrompt,
  renderArticleExplainPrompt,
  renderSignalExplainPrompt,
  selectRenderer,
  type RenderArgs,
} from '../../lib/orca/renderers'
import { HARD_RULES, MANDATORY_DISCLAIMER } from '../../lib/orca/shared-rules'
import type {
  ToolCall,
  ToolResult,
  UserProfileSnapshot,
} from '../../lib/orca/orchestrator/types'

const baseProfile: UserProfileSnapshot = {
  user_id: 'u1',
  experience_level: 'intermediate',
  primary_goal: 'research',
  risk_tolerance: 'balanced',
  time_horizon: 'swing',
  preferred_chains: ['ethereum', 'solana'],
}

function mkArgs(over: Partial<RenderArgs> = {}): RenderArgs {
  return {
    toolResults: [],
    profile: baseProfile,
    message: 'explain please',
    ...over,
  }
}

function mkResult(
  tool: ToolCall['tool'],
  args: any,
  data: any
): { call: ToolCall; result: ToolResult } {
  return {
    call: { tool, args },
    result: { ok: true, data, source: tool, fetched_at: '2026-06-02T12:00:00Z' },
  }
}

describe('renderers (W3) — shared properties', () => {
  const everyRenderer: Array<[string, (a: RenderArgs) => string]> = [
    ['wallet_lookup', renderWalletLookupPrompt],
    ['article_explain', renderArticleExplainPrompt],
    ['signal_explain', renderSignalExplainPrompt],
  ]
  for (const [name, fn] of everyRenderer) {
    it(`${name} ends with the mandatory disclaimer verbatim`, () => {
      const out = fn(mkArgs())
      expect(out).toContain(MANDATORY_DISCLAIMER)
    })

    it(`${name} includes the HARD RULES block`, () => {
      const out = fn(mkArgs())
      expect(out).toContain(HARD_RULES)
    })

    it(`${name} echoes the user message`, () => {
      const out = fn(mkArgs({ message: 'why is SOL flagged STRONG BUY?' }))
      expect(out).toContain('why is SOL flagged STRONG BUY?')
    })
  }
})

describe('renderers (W3) — wallet_lookup', () => {
  it('surfaces wallet activity data with the label', () => {
    const tr = mkResult(
      'getWalletActivity',
      { address: '0xabc', chain: 'eth' },
      { label: 'Binance Hot', tx_count: 12, net_flow_usd: 5_000_000 }
    )
    const out = renderWalletLookupPrompt(mkArgs({ toolResults: [tr] }))
    expect(out).toContain('tool=getWalletActivity')
    expect(out).toContain('Binance Hot')
    expect(out).toContain('5000000')
  })
})

describe('renderers (W3) — signal_explain', () => {
  it('frames the signal as the engine output, not advice', () => {
    const out = renderSignalExplainPrompt(mkArgs())
    expect(out).toMatch(/engine'?s? (current )?(verdict|inputs|output)/i)
    // The renderer must explicitly forbid translating the verdict into a
    // recommendation. The literal forbid string contains "buy/sell/hold",
    // so we assert the prohibition is present rather than absent.
    expect(out).toMatch(/DO NOT translate the verdict/i)
  })
})

describe('selectRenderer (W3)', () => {
  it('returns the wallet_lookup renderer for the wallet_lookup intent', () => {
    expect(selectRenderer('wallet_lookup')).toBe(renderWalletLookupPrompt)
  })
  it('returns the article_explain renderer', () => {
    expect(selectRenderer('article_explain')).toBe(renderArticleExplainPrompt)
  })
  it('returns the signal_explain renderer', () => {
    expect(selectRenderer('signal_explain')).toBe(renderSignalExplainPrompt)
  })
})
