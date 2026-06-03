import { describe, expect, it } from 'vitest'
import {
  renderOverviewPrompt,
  renderExplainerPrompt,
  renderDataQueryPrompt,
  renderPersonalPrompt,
  renderFollowupPrompt,
  renderComplianceDeclinePrompt,
  renderArticleExplainPrompt,
  renderSignalExplainPrompt,
  selectRenderer,
  type RenderArgs,
} from '../../lib/orca/renderers'
import { MANDATORY_DISCLAIMER, HARD_RULES } from '../../lib/orca/shared-rules'
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
  it('instructs the writer to lead with a ranked table or numbered list', () => {
    const out = renderDataQueryPrompt(mkArgs())
    expect(out).toMatch(/ranked markdown table or a numbered list/i)
    expect(out).toMatch(/at most 2 sentences of synthesis/i)
  })

  it('instructs the writer to degrade gracefully when data is unavailable', () => {
    const out = renderDataQueryPrompt(mkArgs())
    expect(out).toMatch(/graceful degradation/i)
    expect(out).toMatch(/isn't available right now/i)
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

// =============================================================================
// Proactive Quality Overhaul (2026-06-03) — degradation-path fixes.

describe('overview — Market Pulse (Fix #1/#3)', () => {
  it('instructs sectioned Whales/Social/News list when leaderboards are populated', () => {
    const whales = mkResult('getTrendingWhales', {}, { wallets: [{ address: '0xabc', tx_count: 12 }] })
    const social = mkResult('getTrendingSocial', {}, { tickers: ['SOL', 'BTC'] })
    const news = mkResult('getTrendingNews', {}, { articles: [{ title: 'X' }] })
    const out = renderOverviewPrompt(mkArgs({ toolResults: [whales, social, news] }))
    expect(out).toMatch(/MARKET PULSE — MARKET-WIDE NOTE/)
    expect(out).toMatch(/\*\*Whales\*\*/)
    expect(out).toMatch(/\*\*Social\*\*/)
    expect(out).toMatch(/\*\*News\*\*/)
  })

  it('emits the honest all-quiet contract with two offers when every leaderboard is empty', () => {
    const whales = mkResult('getTrendingWhales', {}, { wallets: [] })
    const social = mkResult('getTrendingSocial', {}, { tickers: [] })
    const news = mkResult('getTrendingNews', {}, { articles: [] })
    const out = renderOverviewPrompt(mkArgs({ toolResults: [whales, social, news] }))
    expect(out).toMatch(/MARKET PULSE — ALL QUIET/)
    expect(out).toMatch(/set up an alert/i)
    expect(out).toMatch(/name a specific token/i)
    // No directional language baked into the all-quiet override block itself.
    const block = out.slice(
      out.indexOf('## MARKET PULSE — ALL QUIET'),
      out.indexOf('## RESPONSE FORMAT')
    )
    expect(block).not.toMatch(/\bbullish\b|\bbearish\b/i)
  })

  it('does not inject Market Pulse for an ordinary per-ticker overview', () => {
    const price = mkResult('getPrice', { ticker: 'BTC' }, { price_usd: 1 })
    const out = renderOverviewPrompt(mkArgs({ toolResults: [price] }))
    expect(out).not.toMatch(/MARKET PULSE/)
  })
})

describe('personal — empty-portfolio onboarding (Fix #4)', () => {
  function emptyPortfolioArgs() {
    const holdings = mkResult('getUserHoldings', { userId: 'u1' }, { holdings: [] })
    const watch = mkResult('getUserWatchlist', { userId: 'u1' }, { tickers: [] })
    const whales = mkResult('getTrendingWhales', { window: '24h' }, { wallets: [{ address: '0xabc' }] })
    return mkArgs({ toolResults: [holdings, watch, whales] })
  }

  it('adds the "not tracking anything yet" framing + confirm-gated add offer', () => {
    const out = renderPersonalPrompt(emptyPortfolioArgs())
    expect(out).toMatch(/not tracking anything yet/i)
    expect(out).toMatch(/\[ Yes, add it \]/)
    expect(out).toMatch(/without an explicit confirmation/i)
  })

  it('does not trigger the onboarding block when the portfolio is non-empty', () => {
    const holdings = mkResult('getUserHoldings', { userId: 'u1' }, { holdings: [{ ticker: 'BTC' }] })
    const watch = mkResult('getUserWatchlist', { userId: 'u1' }, { tickers: [] })
    const out = renderPersonalPrompt(mkArgs({ toolResults: [holdings, watch] }))
    expect(out).not.toMatch(/EMPTY-PORTFOLIO ONBOARDING/)
  })
})

describe('explainer — off-glossary fallback (Fix #5)', () => {
  it('authorises a general definition but forbids live numbers/dates', () => {
    const macro = mkResult('explainMacroFactor', { entities: ['quantitative tightening'] }, { matches: [] })
    const out = renderExplainerPrompt(
      mkArgs({ toolResults: [macro], message: 'what is quantitative tightening?' })
    )
    expect(out).toMatch(/OFF-GLOSSARY FALLBACK/)
    expect(out).toMatch(/general education/i)
    expect(out).toMatch(/MUST NOT cite any specific live numbers/i)
  })

  it('does not add the fallback when the macro tool returned a match', () => {
    const macro = mkResult('explainMacroFactor', { entities: ['cpi'] }, { matches: [{ key: 'cpi', explanation: 'x' }] })
    const out = renderExplainerPrompt(
      mkArgs({ toolResults: [macro], message: 'what is cpi?' })
    )
    expect(out).not.toMatch(/OFF-GLOSSARY FALLBACK/)
  })
})

describe('article_explain — not-found honesty (Fix #6)', () => {
  it('names a ticker alternative when one was extracted', () => {
    const news = mkResult('getNews', { ticker: 'SOL' }, { articles: [] })
    const out = renderArticleExplainPrompt(mkArgs({ toolResults: [news] }))
    expect(out).toMatch(/couldn't pull that article/i)
    expect(out).toMatch(/latest headlines for `SOL`/)
    expect(out).toMatch(/Do NOT invent a summary/i)
  })

  it('offers trending headlines when no ticker was extracted', () => {
    const out = renderArticleExplainPrompt(mkArgs({ toolResults: [] }))
    expect(out).toMatch(/latest trending crypto headlines/i)
  })
})

describe('signal_explain — empty-signal honesty (Fix #6)', () => {
  it('instructs use of on-hand price/whale data with the no-active-signal framing', () => {
    const sig = mkResult('getSignalContext', { ticker: 'BTC' }, { signal: null })
    const price = mkResult('getPrice', { ticker: 'BTC' }, { price_usd: 1 })
    const whales = mkResult('getWhaleFlows', { ticker: 'BTC' }, { net_flow: 0 })
    const out = renderSignalExplainPrompt(mkArgs({ toolResults: [sig, price, whales] }))
    expect(out).toMatch(/no active Sonar signal for `BTC`/)
    expect(out).toMatch(/USE the on-hand getPrice and getWhaleFlows data/)
    expect(out).toMatch(/noisy and less reliable/i)
  })
})

describe('followup — subject carry-over (Fix #2)', () => {
  it('continues the wallet table format when leaderboard data is present', () => {
    const wallets = mkResult('getMostActiveWallets', { window: '24h' }, { wallets: [{ address: '0xabc' }] })
    const out = renderFollowupPrompt(mkArgs({ toolResults: [wallets] }))
    expect(out).toMatch(/follow-up to a wallet leaderboard/i)
  })

  it('keeps signal framing when signal data is present', () => {
    const sig = mkResult('getSignalContext', { ticker: 'BTC' }, { signal: { verdict: 'BUY' } })
    const out = renderFollowupPrompt(mkArgs({ toolResults: [sig] }))
    expect(out).toMatch(/follow-up about a Sonar signal/i)
  })
})

describe('compliance — new fallback instructions are clean', () => {
  // Forbidden vocabulary from lib/orca/shared-rules.ts HARD RULE 5. The scan
  // targets the instruction copy ORCA may echo; structural words inside the
  // standing HARD_RULES / disclaimer block are excluded by trimming them off.
  const FORBIDDEN = [
    'alpha',
    'guaranteed',
    'pump',
    'dump',
    'hedge fund',
    'institutional-grade',
  ]

  function instructionBody(full: string): string {
    // Drop the standing HARD RULES + disclaimer (they legitimately contain
    // forbidden words as prohibitions) and scan the remaining instruction copy.
    return full.split(HARD_RULES).join('').replace(MANDATORY_DISCLAIMER, '')
  }

  const cases: Array<[string, string]> = [
    ['overview all-quiet', renderOverviewPrompt(mkArgs({
      toolResults: [
        mkResult('getTrendingWhales', {}, { wallets: [] }),
        mkResult('getTrendingSocial', {}, { tickers: [] }),
        mkResult('getTrendingNews', {}, { articles: [] }),
      ],
    }))],
    ['personal onboarding', renderPersonalPrompt(mkArgs({
      toolResults: [
        mkResult('getUserHoldings', { userId: 'u1' }, { holdings: [] }),
        mkResult('getUserWatchlist', { userId: 'u1' }, { tickers: [] }),
        mkResult('getTrendingWhales', { window: '24h' }, { wallets: [{ address: '0x1' }] }),
      ],
    }))],
    ['explainer off-glossary', renderExplainerPrompt(mkArgs({
      toolResults: [mkResult('explainMacroFactor', { entities: ['qt'] }, { matches: [] })],
      message: 'what is qt?',
    }))],
    ['article not-found', renderArticleExplainPrompt(mkArgs({
      toolResults: [mkResult('getNews', { ticker: 'SOL' }, { articles: [] })],
    }))],
    ['signal empty', renderSignalExplainPrompt(mkArgs({
      toolResults: [mkResult('getSignalContext', { ticker: 'BTC' }, { signal: null })],
    }))],
  ]

  for (const [name, prompt] of cases) {
    it(`${name} contains no forbidden vocabulary`, () => {
      const body = instructionBody(prompt).toLowerCase()
      for (const word of FORBIDDEN) {
        expect(body).not.toContain(word)
      }
    })
  }
})
