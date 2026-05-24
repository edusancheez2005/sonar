import { describe, it, expect, vi } from 'vitest'
import { parseRouterOutput, routeMessage } from '@/lib/orca/orchestrator/router'

describe('parseRouterOutput', () => {
  it('accepts a well-formed JSON object', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'overview',
        tickers: ['btc', 'ETH'],
        entities: ['Tether'],
        datapoints: ['price', 'whales', 'banana'],
        persona_hint: 'intermediate',
        confidence: 0.9,
      })
    )
    expect(out.intent).toBe('overview')
    expect(out.tickers).toEqual(['BTC', 'ETH'])
    expect(out.datapoints).toEqual(['price', 'whales'])
    expect(out.persona_hint).toBe('intermediate')
    expect(out.confidence).toBe(0.9)
  })

  it('downgrades intent to overview when confidence is below 0.5', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'data_query',
        tickers: ['BTC'],
        entities: [],
        datapoints: ['price'],
        persona_hint: null,
        confidence: 0.2,
      })
    )
    expect(out.intent).toBe('overview')
  })

  it('returns a safe fallback on malformed JSON', () => {
    const out = parseRouterOutput('not json at all')
    expect(out.intent).toBe('overview')
    expect(out.confidence).toBe(0)
    expect(out.tickers).toEqual([])
  })

  it('strips a fenced code block before parsing', () => {
    const out = parseRouterOutput('```json\n{"intent":"explainer","tickers":["BTC"],"entities":[],"datapoints":[],"persona_hint":null,"confidence":0.8}\n```')
    expect(out.intent).toBe('explainer')
  })

  it('clamps confidence to [0,1] and drops malformed tickers', () => {
    const out = parseRouterOutput(
      JSON.stringify({
        intent: 'data_query',
        tickers: ['BTC', 'thisistoolongatickerstring', 'BAD<TAG>'],
        entities: [],
        datapoints: ['price'],
        persona_hint: 'lazy',
        confidence: 99,
      })
    )
    expect(out.confidence).toBe(1)
    expect(out.tickers).toEqual(['BTC'])
    expect(out.persona_hint).toBeNull()
  })

  it('coerces unknown intent to overview', () => {
    const out = parseRouterOutput(
      JSON.stringify({ intent: 'wizardry', tickers: [], entities: [], datapoints: [], persona_hint: null, confidence: 0.9 })
    )
    expect(out.intent).toBe('overview')
  })
})

describe('routeMessage', () => {
  it('passes prior chat history into the prompt', async () => {
    const routerCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        intent: 'followup',
        tickers: ['BTC'],
        entities: [],
        datapoints: ['price'],
        persona_hint: null,
        confidence: 0.95,
      })
    )
    const out = await routeMessage(
      {
        message: 'and the 7d?',
        userId: 'u1',
        chatHistory: [
          { role: 'user', content: 'what is BTC price?' },
          { role: 'assistant', content: 'BTC is at $60k' },
        ],
      },
      { routerCall, writerCall: vi.fn() }
    )
    expect(out.intent).toBe('followup')
    expect(routerCall).toHaveBeenCalledOnce()
    const userBlock = (routerCall.mock.calls[0] ?? [])[1] as string
    expect(userBlock).toContain('Prior turns')
    expect(userBlock).toContain('what is BTC price')
  })

  it('falls back to overview when the model call throws', async () => {
    const routerCall = vi.fn().mockRejectedValue(new Error('boom'))
    const out = await routeMessage(
      { message: 'hi', userId: 'u1', chatHistory: [] },
      { routerCall, writerCall: vi.fn() }
    )
    expect(out.intent).toBe('overview')
    expect(out.confidence).toBe(0)
  })
})
