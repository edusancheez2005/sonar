import { describe, it, expect } from 'vitest'
import { isWriteTool, planToolCalls } from '@/lib/orca/orchestrator/planner'
import type { RouterDecision } from '@/lib/orca/orchestrator/types'

function decision(over: Partial<RouterDecision> = {}): RouterDecision {
  return {
    intent: 'overview',
    tickers: [],
    entities: [],
    datapoints: [],
    persona_hint: null,
    confidence: 0.9,
    ...over,
  }
}

describe('planToolCalls', () => {
  it('emits nothing for compliance_decline', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'compliance_decline', tickers: ['BTC'] }),
      profile: null,
      userId: 'u1',
    })
    expect(calls).toEqual([])
  })

  it('fans per-ticker tools across up to 3 tickers', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'overview', tickers: ['BTC', 'ETH', 'SOL', 'DOGE'] }),
      profile: null,
      userId: 'u1',
    })
    const priceCalls = calls.filter((c) => c.tool === 'getPrice')
    expect(priceCalls.map((c) => c.args.ticker)).toEqual(['BTC', 'ETH', 'SOL'])
  })

  it('skips per-ticker tools when no tickers are present', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'overview', tickers: [] }),
      profile: null,
      userId: 'u1',
    })
    expect(calls).toEqual([])
  })

  it('emits user-scoped tools for personal intent', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'personal', tickers: [] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool).sort()
    expect(tools).toContain('getUserHoldings')
    expect(tools).toContain('getUserWatchlist')
    expect(tools).toContain('getOrcaMemory')
    for (const c of calls) {
      if (c.tool.startsWith('getUser') || c.tool === 'getOrcaMemory') {
        expect(c.args.userId).toBe('u1')
      }
    }
  })

  it('honours datapoint overlay (social adds getSocial)', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: ['BTC'], datapoints: ['price', 'social'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getPrice')
    expect(tools).toContain('getSocial')
  })

  it('never schedules a write-tool, even when userConfirmed is true', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'personal', tickers: ['SOL'] }),
      profile: null,
      userId: 'u1',
      userConfirmed: true,
    })
    for (const c of calls) {
      expect(isWriteTool(c.tool)).toBe(false)
    }
  })
})

describe('isWriteTool', () => {
  it('classifies write-tools correctly', () => {
    expect(isWriteTool('addToWatchlist')).toBe(true)
    expect(isWriteTool('removeFromWatchlist')).toBe(true)
    expect(isWriteTool('setUserAlert')).toBe(true)
    expect(isWriteTool('getPrice')).toBe(false)
  })
})
