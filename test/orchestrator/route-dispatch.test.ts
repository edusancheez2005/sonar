import { describe, it, expect } from 'vitest'
import {
  pickStageARoute,
  wantsMarketWideAnswer,
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
