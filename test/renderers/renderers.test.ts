import { describe, expect, it } from 'vitest'
import {
  renderOverviewPrompt,
  renderExplainerPrompt,
  renderDataQueryPrompt,
  renderPersonalPrompt,
  renderFollowupPrompt,
  renderComplianceDeclinePrompt,
  selectRenderer,
  type RenderArgs,
} from '../../lib/orca/renderers'
import { MANDATORY_DISCLAIMER } from '../../lib/orca/shared-rules'
import type {
  ToolCall,
  ToolResult,
  UserProfileSnapshot,
} from '../../lib/orca/orchestrator/types'

const baseProfile: UserProfileSnapshot = {
  user_id: 'u1',
  experience_level: 'intermediate',
  primary_goal: 'research',
  risk_tolerance: 'medium',
  time_horizon: 'swing',
  preferred_chains: ['ethereum', 'solana'],
}

function mkArgs(overrides: Partial<RenderArgs> = {}): RenderArgs {
  return {
    toolResults: [],
    profile: baseProfile,
    message: 'hello',
    ...overrides,
  }
}

function mkResult(
  tool: ToolCall['tool'],
  args: any,
  data: any,
  ok = true
): { call: ToolCall; result: ToolResult } {
  return {
    call: { tool, args },
    result: ok
      ? { ok: true, data, source: tool }
      : { ok: false, error: 'boom', source: tool },
  }
}

describe('renderers — shared properties', () => {
  const everyRenderer: Array<[string, (a: RenderArgs) => string]> = [
    ['overview', renderOverviewPrompt],
    ['explainer', renderExplainerPrompt],
    ['data_query', renderDataQueryPrompt],
    ['personal', renderPersonalPrompt],
    ['followup', renderFollowupPrompt],
  ]

  for (const [name, fn] of everyRenderer) {
    it(`${name} embeds the mandatory disclaimer verbatim`, () => {
      const out = fn(mkArgs())
      expect(out).toContain(MANDATORY_DISCLAIMER)
    })

    it(`${name} includes the user message`, () => {
      const out = fn(mkArgs({ message: 'why did SOL move?' }))
      expect(out).toContain('why did SOL move?')
    })

    it(`${name} surfaces tool results when supplied`, () => {
      const tr = mkResult('getPrice', { ticker: 'SOL' }, { price_usd: 142.7 })
      const out = fn(mkArgs({ toolResults: [tr] }))
      expect(out).toContain('tool=getPrice')
      expect(out).toContain('142.7')
    })
  }
})

describe('renderers — overview', () => {
  it('preserves the research-note section headers verbatim', () => {
    const out = renderOverviewPrompt(mkArgs())
    expect(out).toContain('**Data**')
    expect(out).toContain('**News and Market Impact**')
    expect(out).toContain('**Bottom Line**')
    expect(out).toContain('Follow-up question:')
  })

  it('forbids emojis in its formatting rules', () => {
    const out = renderOverviewPrompt(mkArgs())
    expect(out).toMatch(/No emojis/i)
  })

  it('calibrates length to the user experience level', () => {
    const newOut = renderOverviewPrompt(
      mkArgs({ profile: { ...baseProfile, experience_level: 'new' } })
    )
    const advOut = renderOverviewPrompt(
      mkArgs({ profile: { ...baseProfile, experience_level: 'advanced' } })
    )
    expect(newOut).toContain('~600 words')
    expect(advOut).toContain('1100-1600 words')
  })

  it('emits the proactive watchlist offer when the focus ticker is not tracked', () => {
    const tr = mkResult('getPrice', { ticker: 'aave' }, { price_usd: 90 })
    const out = renderOverviewPrompt(mkArgs({ toolResults: [tr] }))
    expect(out).toContain("AAVE isn't in your personal dashboard")
    expect(out).toContain('[ Yes, track it ]')
  })

  it('suppresses the proactive offer when the focus ticker is already tracked', () => {
    const priceCall = mkResult('getPrice', { ticker: 'BTC' }, { price_usd: 1 })
    const watchlistCall = mkResult(
      'getUserWatchlist',
      { userId: 'u1' },
      { tickers: ['BTC'] }
    )
    const out = renderOverviewPrompt(
      mkArgs({ toolResults: [priceCall, watchlistCall] })
    )
    expect(out).not.toContain("BTC isn't in your personal dashboard")
  })

  it('suppresses the proactive offer for anonymous users', () => {
    const tr = mkResult('getPrice', { ticker: 'BTC' }, { price_usd: 1 })
    const out = renderOverviewPrompt(
      mkArgs({ profile: null, toolResults: [tr] })
    )
    expect(out).not.toContain("isn't in your personal dashboard")
  })
})

describe('renderers — explainer', () => {
  it('forbids the research-note section headers', () => {
    const out = renderExplainerPrompt(mkArgs())
    expect(out).toContain('DO NOT use **Data**')
    expect(out).toContain('not a research note')
  })

  it('calibrates jargon to experience level', () => {
    const newOut = renderExplainerPrompt(
      mkArgs({ profile: { ...baseProfile, experience_level: 'new' } })
    )
    expect(newOut).toMatch(/no jargon/i)
  })
})

describe('renderers — data_query', () => {
  it('instructs the writer to lead with a focused markdown list', () => {
    const out = renderDataQueryPrompt(mkArgs())
    expect(out).toMatch(/focused markdown list/i)
    expect(out).toMatch(/1-3 sentences of context maximum/i)
  })

  it('instructs the writer to say so when the datapoint is missing', () => {
    const out = renderDataQueryPrompt(mkArgs())
    expect(out).toMatch(/missing from the tool results/i)
  })
})

describe('renderers — personal', () => {
  it('forbids buy/sell/hold language', () => {
    const out = renderPersonalPrompt(mkArgs())
    expect(out).toMatch(/NEVER say "you should buy\/sell\/hold/)
  })

  it('forbids restating the full portfolio back to the user', () => {
    const out = renderPersonalPrompt(mkArgs())
    expect(out).toMatch(/NEVER repeat their portfolio back/)
  })

  it('calibrates the horizon hint to time_horizon=long_term', () => {
    const out = renderPersonalPrompt(
      mkArgs({ profile: { ...baseProfile, time_horizon: 'long_term' } })
    )
    expect(out).toMatch(/long-term focused/)
    expect(out).toMatch(/Do not give 1h commentary/)
  })

  it('emits the proactive offer only for untracked tickers', () => {
    const price = mkResult('getPrice', { ticker: 'LDO' }, { price_usd: 2 })
    const watch = mkResult(
      'getUserWatchlist',
      { userId: 'u1' },
      { tickers: ['BTC'] }
    )
    const out = renderPersonalPrompt(
      mkArgs({ toolResults: [price, watch] })
    )
    expect(out).toContain("LDO isn't in your personal dashboard")
  })

  it('suppresses the proactive offer when the ticker is in holdings', () => {
    const price = mkResult('getPrice', { ticker: 'SOL' }, { price_usd: 1 })
    const holdings = mkResult(
      'getUserHoldings',
      { userId: 'u1' },
      { holdings: [{ ticker: 'SOL', amount: 5 }] }
    )
    const out = renderPersonalPrompt(
      mkArgs({ toolResults: [price, holdings] })
    )
    expect(out).not.toContain("SOL isn't in your personal dashboard")
  })
})

describe('renderers — compliance_decline', () => {
  it('returns a short prompt that wraps the canonical decline string', () => {
    const out = renderComplianceDeclinePrompt(mkArgs())
    expect(out).toMatch(/Reply with EXACTLY this text/)
    expect(out).toMatch(/can't tell you whether to buy or sell/i)
  })
})

describe('selectRenderer', () => {
  it('returns the right function per intent', () => {
    expect(selectRenderer('overview')).toBe(renderOverviewPrompt)
    expect(selectRenderer('explainer')).toBe(renderExplainerPrompt)
    expect(selectRenderer('data_query')).toBe(renderDataQueryPrompt)
    expect(selectRenderer('personal')).toBe(renderPersonalPrompt)
    expect(selectRenderer('followup')).toBe(renderFollowupPrompt)
    expect(selectRenderer('compliance_decline')).toBe(
      renderComplianceDeclinePrompt
    )
  })
})
