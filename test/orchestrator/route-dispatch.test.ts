import { describe, it, expect } from 'vitest'
import {
  pickStageARoute,
  wantsMarketWideAnswer,
  wantsFocusedDataAnswer,
  isTickerFollowUp,
  type StageADecision,
} from '@/lib/orca/route-dispatch'

function decision(over: Partial<StageADecision> = {}): StageADecision {
  return {
    intent: 'overview',
    tickers: [],
    confidence: 0.3,
    ...over,
  }
}

describe('wantsMarketWideAnswer', () => {
  it('returns true for broad answerable market questions', () => {
    expect(wantsMarketWideAnswer("what's happening in the market?")).toBe(true)
    expect(wantsMarketWideAnswer('anything interesting today?')).toBe(true)
    expect(wantsMarketWideAnswer('what should I watch?')).toBe(true)
    expect(wantsMarketWideAnswer('any whale activity?')).toBe(true)
  })

  it('returns false for contentless greetings', () => {
    expect(wantsMarketWideAnswer('hi')).toBe(false)
    expect(wantsMarketWideAnswer('thanks')).toBe(false)
    expect(wantsMarketWideAnswer('ok')).toBe(false)
    expect(wantsMarketWideAnswer('gm')).toBe(false)
  })

  it('returns false for too-short messages', () => {
    expect(wantsMarketWideAnswer('a')).toBe(false)
    expect(wantsMarketWideAnswer('')).toBe(false)
  })
})

describe('pickStageARoute — market-wide fallback', () => {
  it('yields market_wide for a broad no-ticker question', () => {
    const route = pickStageARoute(
      decision({ intent: 'overview', message: 'what is going on in crypto right now?' })
    )
    expect(route.kind).toBe('market_wide')
  })

  it('still falls through for a pure greeting', () => {
    const route = pickStageARoute(decision({ intent: 'overview', message: 'hi' }))
    expect(route.kind).toBe('fallthrough')
  })

  it('falls through when no message is supplied (legacy callers)', () => {
    const route = pickStageARoute(decision({ intent: 'overview' }))
    expect(route.kind).toBe('fallthrough')
  })

  it('keeps routing rendered intents to the orchestrator', () => {
    const route = pickStageARoute(
      decision({ intent: 'wallet_lookup', message: 'most active wallets?' })
    )
    expect(route.kind).toBe('orchestrator')
  })

  it("routes personal intent to the orchestrator (2026-07-18: watchlist questions answered 'no access')", () => {
    const route = pickStageARoute(
      decision({ intent: 'personal', message: "what's in my watchlist?" })
    )
    expect(route.kind).toBe('orchestrator')
  })

  it('recovers a ticker before considering market-wide', () => {
    const route = pickStageARoute(
      decision({ intent: 'overview', tickers: ['BTC'], message: 'how is the market?' })
    )
    expect(route.kind).toBe('v1_with_ticker')
  })
})

describe('pickStageARoute — followup + hasHistory (§4.2)', () => {
  it('routes a followup WITH history to the orchestrator', () => {
    const route = pickStageARoute(
      decision({ intent: 'followup', message: 'so most of them had sells right?', hasHistory: true })
    )
    expect(route.kind).toBe('orchestrator')
    expect((route as any).intent).toBe('followup')
  })

  it('does NOT route a followup with NO history to the orchestrator (preserves fallthrough)', () => {
    const route = pickStageARoute(
      decision({ intent: 'followup', message: 'so most of them had sells right?', hasHistory: false })
    )
    expect(route.kind).not.toBe('orchestrator')
  })

  it('a followup with no history and no market hint falls through', () => {
    const route = pickStageARoute(decision({ intent: 'followup', message: 'right', hasHistory: false }))
    expect(route.kind).toBe('fallthrough')
  })

  it('compliance_decline still wins over a followup+history', () => {
    const route = pickStageARoute(
      decision({ intent: 'compliance_decline', message: 'should I buy?', hasHistory: true })
    )
    expect(route.kind).toBe('compliance_decline')
  })
})

describe('isTickerFollowUp (Option A — ticker drill-down routing)', () => {
  it('treats short continuation phrasing as a follow-up (drill-down)', () => {
    expect(isTickerFollowUp('just BTC', true)).toBe(true)
    expect(isTickerFollowUp('cool. now just btc ones', true)).toBe(true)
    expect(isTickerFollowUp('what about ETH', true)).toBe(true)
    expect(isTickerFollowUp('now ETH', true)).toBe(true)
    expect(isTickerFollowUp('show me SOL', true)).toBe(true)
  })

  it('treats a bare/short ticker reference as a follow-up when there is history', () => {
    expect(isTickerFollowUp('BTC', true)).toBe(true)
    expect(isTickerFollowUp('BTC whales', true)).toBe(true)
    expect(isTickerFollowUp('ETH ones', true)).toBe(true)
  })

  it('keeps the v1 long-form note for explicit deep-analysis asks', () => {
    expect(isTickerFollowUp('tell me about BTC', true)).toBe(false)
    expect(isTickerFollowUp('full analysis of ETH', true)).toBe(false)
    expect(isTickerFollowUp('give me a deep dive on SOL', true)).toBe(false)
    expect(isTickerFollowUp('breakdown of BTC', true)).toBe(false)
  })

  it('never fires without history (a follow-up needs a prior turn)', () => {
    expect(isTickerFollowUp('just BTC', false)).toBe(false)
    expect(isTickerFollowUp('BTC', false)).toBe(false)
  })

  it('does not fire for a long standalone question', () => {
    expect(
      isTickerFollowUp('what has been driving the price of bitcoin over the past month exactly', true)
    ).toBe(false)
  })
})

describe('pickStageARoute — macro/news events that name a ticker (2026-07-19 audit)', () => {
  it('routes a macro-incident question about Bitcoin to the orchestrator, not the v1 note', () => {
    const route = pickStageARoute(
      decision({
        intent: 'overview',
        tickers: ['BTC'],
        message: 'How did the recent US strikes on Iran affect Bitcoin?',
      })
    )
    expect(route.kind).toBe('orchestrator')
    if (route.kind === 'orchestrator') expect(route.intent).toBe('data_query')
  })

  it('routes rate-cut / ETF-flow questions with a ticker to the orchestrator', () => {
    for (const msg of [
      'what would a Fed rate cut mean for ETH?',
      'are ETF outflows hurting BTC?',
      'did the exploit news hit SOL today?',
    ]) {
      const route = pickStageARoute(decision({ intent: 'overview', tickers: ['ETH'], message: msg }))
      expect(route.kind).toBe('orchestrator')
    }
  })

  it('keeps plain ticker overviews on the v1 long-form path', () => {
    for (const msg of ['tell me about BTC', 'full ETH analysis', 'how is the market?']) {
      const route = pickStageARoute(decision({ intent: 'overview', tickers: ['BTC'], message: msg }))
      expect(route.kind).toBe('v1_with_ticker')
    }
  })
})

describe('wantsFocusedDataAnswer — extracted-ticker bypass guard (2026-07-20 audit)', () => {
  it('fires for macro-event and whale-flow questions', () => {
    expect(wantsFocusedDataAnswer('How did the recent US strikes on Iran affect Bitcoin?')).toBe(true)
    expect(wantsFocusedDataAnswer('What are whales doing with ETH in the last 24 hours?')).toBe(true)
    expect(wantsFocusedDataAnswer('Who were the biggest BTC whale buyers this week?')).toBe(true)
  })

  it('stays quiet for plain ticker overviews', () => {
    expect(wantsFocusedDataAnswer('tell me about BTC')).toBe(false)
    expect(wantsFocusedDataAnswer('full ETH analysis')).toBe(false)
    expect(wantsFocusedDataAnswer("what's the price of SOL?")).toBe(false)
  })
})
