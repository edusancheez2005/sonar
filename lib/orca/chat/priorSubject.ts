/**
 * derivePriorSubject — extract the previous turn's subject for follow-ups.
 * =============================================================================
 * §4.1 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md.
 *
 * A `followup` intent ("so most of them had sells right?") is only useful if
 * the planner knows what the *prior* turn was about. The V2 path used to read
 * this inline; this helper centralises it so BOTH live request paths (V2 and
 * the Stage A SSE bridge) derive the same {priorIntent, priorTickers}.
 *
 * Source of truth is the most-recent `chat_history` row (it carries the
 * structured `data_sources_used.intent` + `tickers_mentioned`). `recentTurns`
 * is accepted for signature parity and as a presence guard — we never invent a
 * prior subject when there is no history at all.
 *
 * Pure + never throws. Returns {} when nothing usable is present.
 */
import type { Intent } from '../orchestrator/types'
import type { RecentTurn } from './loadRecentHistory'

const VALID_INTENTS: ReadonlySet<Intent> = new Set<Intent>([
  'overview',
  'explainer',
  'data_query',
  'followup',
  'personal',
  'compliance_decline',
  'wallet_lookup',
  'article_explain',
  'signal_explain',
])

export interface LastChatRow {
  /** jsonb column; the V2 path persists `{ intent }` here. */
  data_sources_used?: { intent?: unknown } | null
  /** text[] column on chat_history. */
  tickers_mentioned?: unknown
}

export interface PriorSubject {
  priorIntent?: Intent
  priorTickers?: string[]
}

export function derivePriorSubject(
  recentTurns: RecentTurn[] | null | undefined,
  lastChatRow: LastChatRow | null | undefined
): PriorSubject {
  // No history at all ⇒ no carry-over (a follow-up needs a prior turn).
  if (!Array.isArray(recentTurns) || recentTurns.length === 0) return {}
  if (!lastChatRow || typeof lastChatRow !== 'object') return {}

  const out: PriorSubject = {}

  const rawIntent = (lastChatRow.data_sources_used ?? {})?.intent
  if (typeof rawIntent === 'string' && VALID_INTENTS.has(rawIntent as Intent)) {
    out.priorIntent = rawIntent as Intent
  }

  if (Array.isArray(lastChatRow.tickers_mentioned)) {
    const tickers: string[] = []
    for (const t of lastChatRow.tickers_mentioned) {
      if (typeof t !== 'string') continue
      const s = t.trim().toUpperCase()
      if (s && !tickers.includes(s)) tickers.push(s)
    }
    if (tickers.length > 0) out.priorTickers = tickers
  }

  return out
}
