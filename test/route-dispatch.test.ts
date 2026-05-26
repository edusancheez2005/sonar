/**
 * Tests for the Stage A intent dispatcher.
 *
 * Locks in the 2026-05-26 bug fixes:
 *   1. When intent is article_explain / wallet_lookup / data_query /
 *      signal_explain, we ALWAYS go to the orchestrator — even if the
 *      router returned incidental tickers in `tickers[]`.
 *   2. When intent is `compliance_decline`, return the hardcoded decline.
 *   3. When intent is overview/unknown but router caught a ticker, we hand
 *      off to the v1 long-form research note path.
 *   4. When intent is overview/personal/etc with no tickers, fall through.
 */
import { describe, expect, it } from 'vitest'
import { pickStageARoute } from '../lib/orca/route-dispatch'

describe('pickStageARoute', () => {
  it('routes article_explain to orchestrator even when router included an incidental ticker', () => {
    // THE EXACT FAILURE FROM PRODUCTION 2026-05-26:
    // user pasted https://decrypt.co/.../uniswap-...; router correctly
    // returned article_explain but ALSO tickers=['UNI']; old code took
    // the ticker path and produced a UNI research note. Must not happen.
    const route = pickStageARoute({
      intent: 'article_explain',
      tickers: ['UNI'],
      confidence: 0.9,
    })
    expect(route.kind).toBe('orchestrator')
    if (route.kind === 'orchestrator') {
      expect(route.intent).toBe('article_explain')
    }
  })

  it('routes wallet_lookup to orchestrator (no tickers)', () => {
    const route = pickStageARoute({
      intent: 'wallet_lookup',
      tickers: [],
      confidence: 0.95,
    })
    expect(route.kind).toBe('orchestrator')
  })

  it('routes wallet_lookup to orchestrator even when tickers leak in', () => {
    // Defensive: if the router ever attaches an incidental ticker to a
    // wallet question (e.g. ENS that resolves to a known holder), we must
    // still go to the wallet renderer.
    const route = pickStageARoute({
      intent: 'wallet_lookup',
      tickers: ['ETH'],
      confidence: 0.9,
    })
    expect(route.kind).toBe('orchestrator')
  })

  it('routes data_query to orchestrator', () => {
    const route = pickStageARoute({
      intent: 'data_query',
      tickers: [],
      confidence: 0.85,
    })
    expect(route.kind).toBe('orchestrator')
  })

  it('routes signal_explain to orchestrator', () => {
    const route = pickStageARoute({
      intent: 'signal_explain',
      tickers: ['BTC'],
      confidence: 0.9,
    })
    expect(route.kind).toBe('orchestrator')
  })

  it('routes compliance_decline to the hardcoded decline', () => {
    const route = pickStageARoute({
      intent: 'compliance_decline',
      tickers: ['SOL'],
      confidence: 0.95,
    })
    expect(route.kind).toBe('compliance_decline')
  })

  it('routes overview with a router-recovered ticker to the v1 path', () => {
    const route = pickStageARoute({
      intent: 'overview',
      tickers: ['ONDO'],
      confidence: 0.8,
    })
    expect(route.kind).toBe('v1_with_ticker')
    if (route.kind === 'v1_with_ticker') {
      expect(route.ticker).toBe('ONDO')
      expect(route.confidence).toBeGreaterThanOrEqual(0.6)
    }
  })

  it('clamps recovered-ticker confidence to a minimum of 0.6', () => {
    const route = pickStageARoute({
      intent: 'overview',
      tickers: ['ONDO'],
      confidence: 0.3,
    })
    expect(route.kind).toBe('v1_with_ticker')
    if (route.kind === 'v1_with_ticker') {
      expect(route.confidence).toBe(0.6)
    }
  })

  it('falls through for personal intent with no tickers', () => {
    const route = pickStageARoute({
      intent: 'personal',
      tickers: [],
      confidence: 0.7,
    })
    expect(route.kind).toBe('fallthrough')
  })

  it('falls through for unknown intent with no tickers', () => {
    const route = pickStageARoute({
      intent: 'unknown',
      tickers: [],
      confidence: 0.4,
    })
    expect(route.kind).toBe('fallthrough')
  })
})
