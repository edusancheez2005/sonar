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
  /** True when the server loaded prior conversation turns for this user.
   *  A `followup` intent only makes sense with a prior turn, so when history
   *  is present we route it to the orchestrator (which carries the prior
   *  subject forward) instead of dead-ending on the legacy greeting. */
  hasHistory?: boolean
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

// A short continuation cue at the START of a follow-up ("just BTC", "now ETH",
// "what about SOL", "cool, and BTC", "ok show me ETH").
const FOLLOWUP_CUE_RE =
  /^\s*(?:ok(?:ay)?|cool|nice|great|got it|and|also|then|now|so|just|only|what about|how about|show me|give me|pull up|check)\b/i

// An explicit request for the full research note — these KEEP the v1 long-form
// path even when there is history, so "tell me about BTC" / "full ETH analysis"
// are never downgraded to the short drill-down.
const DEEP_ANALYSIS_RE =
  /\b(tell me about|full|in[- ]?depth|deep[- ]?dive|break ?down|breakdown|analy[sz]e|analysis|everything about|research note|complete (?:picture|analysis|overview)|overview of|rundown|report on|brief me)\b/i

/**
 * True when a ticker-bearing message is a SHORT FOLLOW-UP that should drill
 * down through the orchestrator (agentic loop) instead of dumping the full v1
 * long-form research note. Requires prior history (a follow-up needs a prior
 * turn). Explicit "deep analysis" asks are excluded so the long-form note is
 * preserved for "tell me about BTC" / "full ETH analysis".
 *
 * Pure + deterministic; the route handler only consults it when the ticker
 * extractor already found a ticker.
 */
export function isTickerFollowUp(message: string | undefined, hasHistory: boolean): boolean {
  if (!hasHistory) return false
  const m = (message ?? '').trim()
  if (!m) return false
  if (DEEP_ANALYSIS_RE.test(m)) return false
  const words = m.split(/\s+/).filter(Boolean).length
  if (FOLLOWUP_CUE_RE.test(m)) return true
  // Bare / very short ticker reference after a prior turn ("BTC", "BTC?",
  // "BTC whales", "ETH ones").
  if (words <= 4) return true
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
  // §4.2 — a follow-up only makes sense with a prior turn. When the server
  // loaded history, send it to the orchestrator so the prior subject is
  // carried forward; otherwise fall through to the legacy greeting/market-wide
  // handling below (a contentless "followup" with no history is just chatter).
  if (decision.intent === 'followup' && decision.hasHistory) {
    return { kind: 'orchestrator', intent: 'followup' }
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
