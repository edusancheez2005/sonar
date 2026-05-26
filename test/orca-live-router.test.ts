/**
 * @vitest-environment node
 *
 * LIVE router + dispatch integration test.
 *
 * This test calls the REAL grok-4-fast-non-reasoning router (or OpenAI
 * fallback) with the exact prompts the user typed in production on
 * 2026-05-26 and asserts the dispatcher would have taken the right path.
 *
 * Opt-in: only runs when LIVE_ROUTER_TESTS=1 is set, because it costs LLM
 * tokens. Run locally before shipping any Stage A change:
 *
 *   $env:LIVE_ROUTER_TESTS='1'; npx vitest run test/orca-live-router.test.ts
 */
import { describe, expect, it, beforeAll } from 'vitest'
import OpenAI from 'openai'
import { routeMessage } from '../lib/orca/orchestrator/router'
import { pickStageARoute } from '../lib/orca/route-dispatch'
import { hasNonTickerSurface } from '../lib/orca/non-ticker-surface'
import { extractTicker } from '../lib/orca/ticker-extractor'

const enabled = process.env.LIVE_ROUTER_TESTS === '1'
const describeLive = enabled ? describe : describe.skip

function buildModel() {
  const xaiKey = process.env.XAI_API_KEY
  const client = xaiKey
    ? new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true })
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true })
  const miniModel = xaiKey ? 'grok-4-fast-non-reasoning' : 'gpt-4.1-mini'
  return {
    routerCall: async (sys: string, usr: string) => {
      const r = await client.chat.completions.create({
        model: miniModel,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: usr },
        ],
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' } as any,
      })
      return r.choices[0]?.message?.content ?? ''
    },
    writerCall: async () => '',
  }
}

describeLive('LIVE router + dispatcher — production prompt regressions', () => {
  // Lazy — only constructed inside tests, so CI never trips on missing
  // OPENAI_API_KEY when LIVE_ROUTER_TESTS is unset and the describe is
  // skipped (the describe body still runs during collection).
  let model: ReturnType<typeof buildModel>
  beforeAll(() => { model = buildModel() })

  async function simulate(message: string) {
    // Mirror the route.ts pre-router pipeline.
    let tickerResult = extractTicker(message)
    if (tickerResult.ticker && hasNonTickerSurface(message)) {
      tickerResult = { ticker: null, confidence: 0, normalized: null, originalMatch: null } as any
    }
    if (tickerResult.ticker) {
      return { path: 'v1_ticker_legacy', ticker: tickerResult.ticker } as const
    }
    const decision = await routeMessage({ message, userId: 'test', chatHistory: [] }, model)
    const route = pickStageARoute({
      intent: decision.intent,
      tickers: decision.tickers,
      confidence: decision.confidence,
    })
    return { path: 'router', decision, route } as const
  }

  it('wallet address → orchestrator wallet_lookup (NOT ZRX research note)', async () => {
    const r = await simulate(
      'what is wallet 0x28C6c06298d514Db089934071355E5743bf21d60 doing'
    )
    expect(r.path).toBe('router')
    if (r.path === 'router') {
      expect(r.route.kind).toBe('orchestrator')
      if (r.route.kind === 'orchestrator') {
        expect(r.route.intent).toBe('wallet_lookup')
      }
    }
  }, 30000)

  it('ABBREVIATED wallet address "0x28C6...d60" → orchestrator wallet_lookup (NOT ZRX)', async () => {
    // 2026-05-26 production regression: user typed abbreviated form copied
    // from a block explorer / our own UI. Must NOT fall to v1 ZRX path.
    const r = await simulate('0x28C6...d60')
    expect(r.path).toBe('router')
    if (r.path === 'router') {
      expect(r.route.kind).toBe('orchestrator')
      if (r.route.kind === 'orchestrator') {
        expect(r.route.intent).toBe('wallet_lookup')
      }
    }
  }, 30000)

  it('article URL → orchestrator article_explain (NOT UNI research note)', async () => {
    const r = await simulate(
      'explain this article: https://decrypt.co/2026/05/26/uniswap-v5-launches'
    )
    expect(r.path).toBe('router')
    if (r.path === 'router') {
      expect(r.route.kind).toBe('orchestrator')
      if (r.route.kind === 'orchestrator') {
        expect(r.route.intent).toBe('article_explain')
      }
    }
  }, 30000)

  it('"biggest whale buys today" → orchestrator data_query', async () => {
    const r = await simulate('biggest whale buys today')
    expect(r.path).toBe('router')
    if (r.path === 'router') {
      expect(r.route.kind).toBe('orchestrator')
      if (r.route.kind === 'orchestrator') {
        expect(r.route.intent).toBe('data_query')
      }
    }
  }, 30000)

  it('"should I buy SOL right now" → v1 ticker path (extractor wins; compliance is handled by the v1 system prompt HARD RULE #3)', async () => {
    // Pre-existing behaviour: ticker extractor finds SOL before the router
    // runs, so the message goes to the v1 long-form path where the system
    // prompt itself refuses to give buy/sell advice. Stage A is intentionally
    // additive and does not change this.
    const r = await simulate('should I buy SOL right now')
    expect(r.path).toBe('v1_ticker_legacy')
    if (r.path === 'v1_ticker_legacy') {
      expect(r.ticker).toBe('SOL')
    }
  })

  it('"what is btc doing today" → v1 ticker legacy path (BTC)', async () => {
    const r = await simulate('what is btc doing today')
    expect(r.path).toBe('v1_ticker_legacy')
    if (r.path === 'v1_ticker_legacy') {
      expect(r.ticker).toBe('BTC')
    }
  })
})
