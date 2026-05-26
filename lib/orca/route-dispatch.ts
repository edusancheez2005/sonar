/**
 * route-dispatch
 * =============================================================================
 * Pure decision logic for the Stage A intent dispatcher in app/api/chat/route.ts.
 *
 * Extracted so it can be unit-tested without mocking Supabase / OpenAI / Next.
 * The bug this exists to prevent (2026-05-26): the router returns intent
 * `article_explain` with incidental tickers `['UNI']` for an article URL
 * about Uniswap, and the route handler was checking tickers FIRST → routing
 * to the v1 long-form ticker note instead of the article_explain renderer.
 */

export type StageADecision = {
  intent: string
  tickers: string[]
  confidence: number
}

export type StageARoute =
  | { kind: 'compliance_decline' }
  | { kind: 'orchestrator'; intent: string }
  | { kind: 'v1_with_ticker'; ticker: string; confidence: number }
  | { kind: 'fallthrough' }

const RENDERED_INTENTS = new Set([
  'wallet_lookup',
  'article_explain',
  'data_query',
  'signal_explain',
])

/**
 * Decide what to do with a router decision. Intent always wins over
 * incidental ticker matches — see file-level comment.
 */
export function pickStageARoute(decision: StageADecision): StageARoute {
  if (decision.intent === 'compliance_decline') {
    return { kind: 'compliance_decline' }
  }
  if (RENDERED_INTENTS.has(decision.intent)) {
    return { kind: 'orchestrator', intent: decision.intent }
  }
  if (decision.tickers.length > 0) {
    return {
      kind: 'v1_with_ticker',
      ticker: decision.tickers[0],
      confidence: Math.max(0.6, decision.confidence),
    }
  }
  return { kind: 'fallthrough' }
}
