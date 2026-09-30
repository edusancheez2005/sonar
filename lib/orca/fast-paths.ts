/**
 * Deterministic fast paths for ORCA (2026-09-30).
 * =============================================================================
 * Some questions are asked constantly and always plan the same way. The
 * market-wide "what have whales been doing?" question — the one every new
 * account is greeted with — spent ~2-3s in the Stage-A LLM router and another
 * 4-6s in the agentic planner LLM, only to schedule the single obvious tool
 * (getTrendingWhales over the asked window) every time (orca_traces, all five
 * recent runs). This module recognises that shape and returns the router
 * decision + tool plan directly, so the pipeline goes straight to the tool
 * (~0.3s) and the writer. Anything with a ticker, wallet, named entity or
 * chain filter is left to the LLMs.
 */
import type { RouterDecision, ToolCall } from './orchestrator/types'
import { detectTimeWindow } from './orchestrator/planner'

export interface FastPath {
  name: 'whale_summary'
  decision: RouterDecision
  calls: ToolCall[]
}

const WHALE_WORD_RE = /\bwhales?\b/i
const ACTIVITY_RE =
  /\b(doing|done|been (?:up to|doing)|up to|activity|activities|mov(?:e|es|ing|ed)|buying|selling|bought|sold|accumulat\w*|dump\w*|net (?:buy|sell)\w*|flows?|behav\w*|happening|going on)\b/i
// Shapes that map to OTHER tools or need an LLM to disambiguate.
const EXCLUDE_RE =
  /\b(wallet|address|0x[0-9a-f]{6,}|who (?:is|are|was|were)|which (?:wallet|whale|address)|most (?:profitable|active)|best (?:performing|whale)|top (?:wallet|whale)s?\b|largest (?:transaction|transfer|trade)s?|biggest (?:transaction|transfer|trade)s?|leaderboard|follow|track|alert|watchlist|my |vitalik|binance|coinbase|mrbeast|trump|musk|solana|ethereum|polygon|bitcoin|btc|eth|sol|xrp|bnb|arbitrum|base chain|tron|on (?:chain|the) [a-z]+ chain)\b/i

/**
 * Market-wide whale-activity question with no ticker / wallet / chain /
 * entity → data_query + getTrendingWhales(window). Returns null otherwise.
 */
export function matchFastPath(message: string, hasTicker: boolean): FastPath | null {
  if (hasTicker) return null
  const m = String(message || '').trim()
  if (m.length < 8 || m.length > 240) return null
  if (!WHALE_WORD_RE.test(m) || !ACTIVITY_RE.test(m)) return null
  if (EXCLUDE_RE.test(m)) return null
  const window = detectTimeWindow(m)
  return {
    name: 'whale_summary',
    decision: {
      intent: 'data_query',
      tickers: [],
      entities: [],
      datapoints: ['whales'],
      persona_hint: null,
      confidence: 0.95,
    },
    calls: [{ tool: 'getTrendingWhales', args: { window } }],
  }
}
