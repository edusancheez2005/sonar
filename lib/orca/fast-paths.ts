/**
 * Deterministic fast paths for ORCA (2026-09-30).
 * =============================================================================
 * The Stage-A LLM router (~3-5s) and the agentic planner LLM (4-6s) cost
 * 7-10s on EVERY orchestrator answer, and for single-facet questions they
 * always produce the same decision and the same one- or two-tool plan
 * (orca_traces). This module recognises those shapes from the message and
 * the extracted ticker and returns the router decision + tool plan directly,
 * so the pipeline goes straight to the tools (~0.3s) and the writer.
 *
 * Left to the LLMs: compare questions, macro/news EVENT impact (needs live
 * search), wallets/addresses/entities, two or more tickers, multi-facet asks,
 * explainers, anything personal, and anything ambiguous.
 */
import type { Datapoint, RouterDecision, ToolCall } from './orchestrator/types'
import { detectTimeWindow } from './orchestrator/planner'
import { extractTickers } from './ticker-extractor'
import {
  COMPARE_RE,
  DERIV_FOCUS_RE,
  MACRO_EVENT_RE,
  MOVE_WHY_RE,
  NEWS_FOCUS_RE,
  PRICE_FOCUS_RE,
  SOCIAL_FOCUS_RE,
  WHALE_FOCUS_RE,
} from './route-dispatch'

export type FastPathName =
  | 'whale_summary'
  | 'whale_ticker'
  | 'news_ticker'
  | 'news_market'
  | 'price_ticker'
  | 'social_ticker'
  | 'social_market'
  | 'deriv_ticker'
  | 'largest_transactions'
  | 'why_move'

export interface FastPath {
  name: FastPathName
  decision: RouterDecision
  calls: ToolCall[]
}

const ACTIVITY_RE =
  /\b(doing|done|been (?:up to|doing)|up to|activity|activities|mov(?:e|es|ing|ed)|buying|selling|bought|sold|accumulat\w*|dump\w*|net (?:buy|sell)\w*|flows?|behav\w*|happening|going on)\b/i
// Shapes that need an LLM (or map to tools with entity arguments).
const NEEDS_LLM_RE =
  /\b(wallet|address|0x[0-9a-f]{6,}|who (?:is|are|was|were)|which (?:wallet|whale|address)|most (?:profitable|active)|best (?:performing|whale)|top (?:wallet|whale)s?\b|leaderboard|follow|track|alert|watchlist|\bmy\b|portfolio|holdings?|vitalik|binance|coinbase|mrbeast|trump|musk|explain|what (?:is|does|are) (?:a |an |the )?\w+ (?:mean|means)|should i|predict\w*|forecast|target)\b/i
const CHAIN_RE = /\b(solana|ethereum|polygon|bitcoin network|arbitrum|base chain|tron|bsc|bnb chain|on (?:chain|the) [a-z]+ chain)\b/i
const LARGEST_TX_RE = /\b(largest|biggest|top)\s+(?:\d+\s+)?(?:whale\s+)?(?:transactions?|transfers?|trades?|txs?)\b/i

function decision(datapoints: Datapoint[], tickers: string[]): RouterDecision {
  return { intent: 'data_query', tickers, entities: [], datapoints, persona_hint: null, confidence: 0.95 }
}

/**
 * @param message  raw user message
 * @param tickers  tickers the route already extracted (0 or 1 used; ≥2 → null)
 */
export function matchFastPath(message: string, tickersIn: string[] | boolean = []): FastPath | null {
  // Back-compat with the first version's (message, hasTicker) signature.
  const tickers = Array.isArray(tickersIn) ? tickersIn : []
  if (tickersIn === true) return null
  const m = String(message || '').trim()
  if (m.length < 6 || m.length > 240) return null
  if (COMPARE_RE.test(m) || MACRO_EVENT_RE.test(m) || NEEDS_LLM_RE.test(m)) return null
  const allTickers = Array.from(new Set([...tickers, ...extractTickers(m)].map((t) => String(t).toUpperCase())))
  if (allTickers.length >= 2) return null
  const t = allTickers[0] ?? null
  const window = detectTimeWindow(m)

  const facets = {
    whale: WHALE_FOCUS_RE.test(m),
    news: NEWS_FOCUS_RE.test(m),
    price: PRICE_FOCUS_RE.test(m),
    social: SOCIAL_FOCUS_RE.test(m),
    deriv: DERIV_FOCUS_RE.test(m),
    largest: LARGEST_TX_RE.test(m),
    why: MOVE_WHY_RE.test(m),
  }

  // "Why did BTC move today?" — price + news + whale flows for the ticker.
  if (facets.why && t) {
    return {
      name: 'why_move',
      decision: decision(['price', 'news', 'whales'], [t]),
      calls: [
        { tool: 'getPrice', args: { ticker: t } },
        { tool: 'getNews', args: { ticker: t, limit: 8 } },
        { tool: 'getWhaleFlows', args: { ticker: t, window: '24h' } },
      ],
    }
  }

  // Single facet only — two facets in one sentence go to the LLM planner.
  const active = (['whale', 'news', 'price', 'social', 'deriv', 'largest'] as const).filter((k) => facets[k])
  // "largest transactions" also matches the whale regex; treat as one facet.
  const facetSet = new Set(active)
  if (facetSet.has('largest')) facetSet.delete('whale')
  if (facetSet.size !== 1) return null
  const facet = Array.from(facetSet)[0]

  switch (facet) {
    case 'largest':
      if (t || CHAIN_RE.test(m)) return null
      return { name: 'largest_transactions', decision: decision(['whales'], []), calls: [{ tool: 'getLargestTransactions', args: { window } }] }
    case 'whale':
      if (CHAIN_RE.test(m)) return null
      if (t) {
        return {
          name: 'whale_ticker',
          decision: decision(['whales'], [t]),
          calls: [{ tool: 'getWhaleFlows', args: { ticker: t, window } }, { tool: 'getPrice', args: { ticker: t } }],
        }
      }
      if (!ACTIVITY_RE.test(m)) return null
      return { name: 'whale_summary', decision: decision(['whales'], []), calls: [{ tool: 'getTrendingWhales', args: { window } }] }
    case 'news':
      if (t) {
        return {
          name: 'news_ticker',
          decision: decision(['news'], [t]),
          calls: [{ tool: 'getNews', args: { ticker: t, limit: 8 } }, { tool: 'getPrice', args: { ticker: t } }],
        }
      }
      return { name: 'news_market', decision: decision(['news'], []), calls: [{ tool: 'getTrendingNews', args: {} }] }
    case 'price':
      if (!t) return null
      return { name: 'price_ticker', decision: decision(['price'], [t]), calls: [{ tool: 'getPrice', args: { ticker: t } }] }
    case 'social':
      if (t) {
        return {
          name: 'social_ticker',
          decision: decision(['social'], [t]),
          calls: [{ tool: 'getSocial', args: { ticker: t } }, { tool: 'getPrice', args: { ticker: t } }],
        }
      }
      return { name: 'social_market', decision: decision(['social'], []), calls: [{ tool: 'getTrendingSocial', args: {} }] }
    case 'deriv':
      if (!t) return null
      return {
        name: 'deriv_ticker',
        decision: decision(['price'], [t]),
        calls: [{ tool: 'getDerivatives', args: { ticker: t } }, { tool: 'getPrice', args: { ticker: t } }],
      }
    default:
      return null
  }
}
