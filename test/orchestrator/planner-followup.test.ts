import { describe, it, expect } from 'vitest'
import { planToolCalls } from '@/lib/orca/orchestrator/planner'
import type { PlannerInput, RouterDecision } from '@/lib/orca/orchestrator/types'

function decision(over: Partial<RouterDecision> = {}): RouterDecision {
  return {
    intent: 'followup',
    tickers: [],
    entities: [],
    datapoints: [],
    persona_hint: null,
    confidence: 0.9,
    ...over,
  }
}

function input(over: Partial<PlannerInput> = {}): PlannerInput {
  return {
    router: decision(),
    profile: null,
    userId: 'u1',
    message: 'so most of them had loads of sells right?',
    ...over,
  }
}

describe('planFollowupCarryOver (§4.2)', () => {
  it('re-emits getTrendingWhales for a market-wide whale-table follow-up (data_query prior, no tickers)', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'followup', tickers: [] }), priorIntent: 'data_query', priorTickers: [] })
    )
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingWhales')
    expect(tools).not.toContain('getPrice')
  })

  it('re-emits getTrendingWhales for an overview prior with no tickers', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'followup', tickers: [] }), priorIntent: 'overview', priorTickers: [] })
    )
    expect(calls.map((c) => c.tool)).toContain('getTrendingWhales')
  })

  it('drills into a ticker the follow-up itself names ("just BTC" after an overview)', () => {
    const calls = planToolCalls(
      input({
        router: decision({ intent: 'followup', tickers: ['BTC'] }),
        message: 'just BTC',
        priorIntent: 'overview',
        priorTickers: [],
      })
    )
    const price = calls.filter((c) => c.tool === 'getPrice')
    const whales = calls.filter((c) => c.tool === 'getWhaleFlows')
    expect(price.map((c) => c.args.ticker)).toContain('BTC')
    expect(whales.map((c) => c.args.ticker)).toContain('BTC')
    expect(calls.map((c) => c.tool)).not.toContain('getTrendingWhales')
  })

  it('inherits prior tickers when the follow-up names none', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'followup', tickers: [] }), priorIntent: 'data_query', priorTickers: ['ETH'] })
    )
    const price = calls.filter((c) => c.tool === 'getPrice')
    expect(price.map((c) => c.args.ticker)).toContain('ETH')
  })

  it('carries a wallet-leaderboard follow-up to getMostActiveWallets', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'followup' }), priorIntent: 'wallet_lookup' })
    )
    expect(calls.map((c) => c.tool)).toEqual(['getMostActiveWallets'])
  })

  it('does not carry over when there is no prior subject (falls back to static map)', () => {
    const calls = planToolCalls(input({ router: decision({ intent: 'followup', tickers: [] }) }))
    // followup static map is getPrice (per-ticker); with no ticker it yields nothing to carry.
    expect(calls.map((c) => c.tool)).not.toContain('getTrendingWhales')
  })
})

describe('planner macro routing (§5.2)', () => {
  it('macro datapoint emits getMacroFactors (not the glossary) for a "what changed" query', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'data_query', datapoints: ['macro'], entities: [] }) })
    )
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getMacroFactors')
    expect(tools).not.toContain('explainMacroFactor')
  })

  it('adds the glossary tool alongside live factors when a named macro term is present', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'data_query', datapoints: ['macro'], entities: ['CPI'] }) })
    )
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getMacroFactors')
    expect(tools).toContain('explainMacroFactor')
  })

  it('skips the live web-search call for a pedagogical explainer turn', () => {
    const calls = planToolCalls(
      input({ router: decision({ intent: 'explainer', datapoints: ['macro'], entities: ['CPI'] }) })
    )
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('explainMacroFactor')
    expect(tools).not.toContain('getMacroFactors')
  })
})
