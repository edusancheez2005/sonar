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
  /** Raw user message — used to classify a contentless greeting vs. a broad
   *  answerable market question (see wantsMarketWideAnswer). Optional so old
   *  callers keep compiling; absence simply preserves legacy fallthrough. */
  message?: string
}

export type StageARoute =
  | { kind: 'compliance_decline' }
  | { kind: 'orchestrator'; intent: string }
  | { kind: 'v1_with_ticker'; ticker: string; confidence: number }
  // A no-rendered-intent, no-ticker message that still wants a real answer
  // (market state / news / "what's happening"). The route handler runs the
  // orchestrator with a market-wide overview plan instead of greeting.
  | { kind: 'market_wide' }
  | { kind: 'fallthrough' }

const RENDERED_INTENTS = new Set([
  'wallet_lookup',
  'article_explain',
  'data_query',
  'signal_explain',
])

const PURE_GREETING =
  /^\s*(hi|hey|hello|yo|gm|thanks|thank you|ok|okay|cool|great|nice|got it|sup)\b[\s!.]*$/i

const MARKET_WIDE_HINT =
  /\b(market|happening|going on|news|trending|whales?|movers?|active|hot|interesting|update|recap|today|right now|watch)\b/i

/**
 * True when a no-rendered-intent, no-ticker message still wants a real answer
 * (market state, news, "what's happening", "what should I watch"), as opposed
 * to a contentless greeting ("hi", "thanks"). Pure heuristics — never an LLM
 * call — so it stays deterministic and unit-testable.
 */
export function wantsMarketWideAnswer(message: string): boolean {
  const m = (message ?? '').trim()
  if (m.length < 3) return false
  if (PURE_GREETING.test(m)) return false
  if (MARKET_WIDE_HINT.test(m)) return true
  // A broad open question (ends with '?' and is more than ~4 words) with no
  // extractable ticker is almost always answerable from market-wide context.
  if (m.includes('?') && m.split(/\s+/).filter(Boolean).length > 4) return true
  return false
}

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
  // No rendered intent and no ticker. Broad answerable market questions go to
  // the orchestrator's market-wide overview plan; genuine greetings keep the
  // legacy light conversational fallthrough.
  if (decision.message !== undefined && wantsMarketWideAnswer(decision.message)) {
    return { kind: 'market_wide' }
  }
  return { kind: 'fallthrough' }
}
