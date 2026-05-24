import { describe, it, expect } from 'vitest'
import { parseRouterOutput } from '@/lib/orca/orchestrator/router'
import { planToolCalls } from '@/lib/orca/orchestrator/planner'
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

describe('router: W3 intents pass-through', () => {
  it('accepts wallet_lookup as a valid intent', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'wallet_lookup',
        tickers: [],
        entities: ['0x1234567890abcdef1234567890abcdef12345678'],
        datapoints: ['whales'],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    expect(out.intent).toBe('wallet_lookup')
    expect(out.entities[0]).toMatch(/^0x/)
  })

  it('accepts article_explain as a valid intent', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'article_explain',
        tickers: ['BTC'],
        entities: ['abc123'],
        datapoints: ['news'],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    expect(out.intent).toBe('article_explain')
  })

  it('accepts signal_explain as a valid intent', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'signal_explain',
        tickers: ['SOL'],
        entities: [],
        datapoints: ['price', 'whales'],
        persona_hint: null,
        confidence: 0.9,
      })
    )
    expect(out.intent).toBe('signal_explain')
    expect(out.tickers).toEqual(['SOL'])
  })
})

describe('planner: W3 intents', () => {
  it('routes wallet_lookup with an ETH-shaped address to getWalletActivity', () => {
    const addr = '0x' + 'a'.repeat(40)
    const calls = planToolCalls({
      router: decision({ intent: 'wallet_lookup', entities: [addr] }),
      profile: null,
      userId: 'u1',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].tool).toBe('getWalletActivity')
    expect(calls[0].args.address).toBe(addr)
    expect(calls[0].args.chain).toBe('eth')
    expect(calls[0].args.userId).toBe('u1')
  })

  it('routes wallet_lookup with a free-text query to findTrackedWallets', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'wallet_lookup', entities: ['Binance hot wallet'] }),
      profile: null,
      userId: 'u1',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].tool).toBe('findTrackedWallets')
    expect(calls[0].args.query).toBe('Binance hot wallet')
  })

  it('routes article_explain to getArticleContext and supporting getNews', () => {
    const calls = planToolCalls({
      router: decision({
        intent: 'article_explain',
        entities: ['https://news.example/x'],
        tickers: ['BTC'],
      }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool).sort()
    expect(tools).toContain('getArticleContext')
    expect(tools).toContain('getNews')
    const article = calls.find((c) => c.tool === 'getArticleContext')!
    expect(article.args.url).toBe('https://news.example/x')
  })

  it('routes signal_explain to getSignalContext + price + whales for each ticker', () => {
    const calls = planToolCalls({
      router: decision({ intent: 'signal_explain', tickers: ['SOL'] }),
      profile: null,
      userId: 'u1',
    })
    const tools = calls.map((c) => c.tool).sort()
    expect(tools).toContain('getSignalContext')
    expect(tools).toContain('getPrice')
    expect(tools).toContain('getWhaleFlows')
    for (const c of calls) {
      expect(c.args.ticker).toBe('SOL')
    }
  })
})
