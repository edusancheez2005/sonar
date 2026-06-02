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

  it('falls back to market-wide leaderboards on bare overview with no ticker', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'overview', tickers: [], datapoints: [] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingWhales')
    expect(tools).toContain('getTrendingSocial')
    expect(tools).not.toContain('getPrice')
    expect(tools).not.toContain('getWhaleFlows')
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

  it('plans getTrendingSocial for a no-ticker social request', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: [], datapoints: ['social'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingSocial')
    expect(tools).not.toContain('getSocial')
  })

  it('uses per-ticker getSocial (not trending) when a ticker is present', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: ['SOL'], datapoints: ['social'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getSocial')
    expect(tools).not.toContain('getTrendingSocial')
  })

  it('plans getTrendingWhales for a no-ticker whales request', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: [], datapoints: ['whales'] }),
      profile: null,
      userId: 'u1',
      message: 'top whale moves this week',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingWhales')
    expect(tools).not.toContain('getWhaleFlows')
    const whaleCall = calls.find((c) => c.tool === 'getTrendingWhales')!
    expect(whaleCall.args.window).toBe('7d')
  })

  it('uses per-ticker getWhaleFlows (not trending) when a ticker is present', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'overview', tickers: ['BTC'], datapoints: ['whales'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getWhaleFlows')
    expect(tools).not.toContain('getTrendingWhales')
  })

  it('detects 24h window hint from message text', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: [], datapoints: ['whales'] }),
      profile: null,
      userId: 'u1',
      message: 'largest whale moves today',
    })
    const whaleCall = calls.find((c) => c.tool === 'getTrendingWhales')!
    expect(whaleCall.args.window).toBe('24h')
  })

  it('plans getTrendingNews for a no-ticker news request', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: [], datapoints: ['news'] }),
      profile: null,
      userId: 'u1',
      message: "what's the latest crypto news?",
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingNews')
    expect(tools).not.toContain('getNews')
  })

  it('uses per-ticker getNews (not trending) when a ticker is present', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'data_query', tickers: ['BTC'], datapoints: ['news'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getNews')
    expect(tools).not.toContain('getTrendingNews')
  })

  it('bare overview includes trending news alongside whales and social', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'overview', tickers: [], datapoints: [] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getTrendingWhales')
    expect(tools).toContain('getTrendingSocial')
    expect(tools).toContain('getTrendingNews')
  })

  it('routes "most active wallet today" to getMostActiveWallets', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'wallet_lookup', tickers: [], entities: [] }),
      profile: null,
      userId: 'u1',
      message: 'tell me about the wallet with the most transactions today',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getMostActiveWallets')
    expect(tools).not.toContain('findTrackedWallets')
    const w = calls.find((c) => c.tool === 'getMostActiveWallets')!
    expect(w.args.window).toBe('24h')
  })

  it('wallet_lookup with no entities and no "most active" hint falls back to findTrackedWallets', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'wallet_lookup', tickers: [], entities: [] }),
      profile: null,
      userId: 'u1',
      message: 'show me a wallet',
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('findTrackedWallets')
    expect(tools).not.toContain('getMostActiveWallets')
  })

  it('re-runs getMostActiveWallets for a "full address for rank N" follow-up', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'wallet_lookup', tickers: [], entities: [] }),
      profile: null,
      userId: 'u1',
      message: "what's the full address for rank 1?",
    })
    const tools = calls.map((c) => c.tool)
    expect(tools).toContain('getMostActiveWallets')
    expect(tools).not.toContain('findTrackedWallets')
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
