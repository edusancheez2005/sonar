/**
 * trimHistory — pure prompt-budget trimming for chat lookback turns.
 * =============================================================================
 * Conversation Lookback Fix (2026-06-02).
 *
 * Caps the per-turn content and the total budget BEFORE the turns are
 * formatted into the writer system prompt. Pure + fully unit-tested.
 */
import type { RecentTurn } from './loadRecentHistory'

export interface TrimOptions {
  maxTurns?: number
  maxUserChars?: number
  maxAssistantChars?: number
}

const DEFAULT_MAX_TURNS = 12
const DEFAULT_MAX_USER_CHARS = 500
const DEFAULT_MAX_ASSISTANT_CHARS = 2000
const TOTAL_BUDGET = 40_000
const TRUNCATION_MARKER = '… [truncated]'

function truncate(content: string, cap: number): string {
  if (typeof content !== 'string') return ''
  if (content.length <= cap) return content
  return content.slice(0, cap) + TRUNCATION_MARKER
}

/**
 * Keep the most-recent N turns (drop oldest first), truncate each turn's
 * content to the per-role cap, then enforce a soft total-char budget while
 * preserving at least the last 2 turns.
 */
export function trimTurnsForPrompt(turns: RecentTurn[], opts: TrimOptions = {}): RecentTurn[] {
  if (!Array.isArray(turns) || turns.length === 0) return []
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS
  const maxUserChars = opts.maxUserChars ?? DEFAULT_MAX_USER_CHARS
  const maxAssistantChars = opts.maxAssistantChars ?? DEFAULT_MAX_ASSISTANT_CHARS

  // Filter malformed rows.
  const clean = turns.filter(
    (t) =>
      t &&
      (t.role === 'user' || t.role === 'assistant') &&
      typeof t.content === 'string' &&
      t.content.trim().length > 0
  )

  // Keep the most-recent N.
  let kept = clean.slice(-Math.max(0, maxTurns))

  // Per-role truncation.
  kept = kept.map((t) => ({
    ...t,
    content: truncate(t.content, t.role === 'user' ? maxUserChars : maxAssistantChars),
  }))

  // Soft total budget — drop oldest until under budget, but never below 2 turns.
  const totalChars = (arr: RecentTurn[]) => arr.reduce((sum, t) => sum + t.content.length, 0)
  while (kept.length > 2 && totalChars(kept) > TOTAL_BUDGET) {
    kept = kept.slice(1)
  }

  return kept
}

export const __internals = {
  DEFAULT_MAX_TURNS,
  DEFAULT_MAX_USER_CHARS,
  DEFAULT_MAX_ASSISTANT_CHARS,
  TOTAL_BUDGET,
  TRUNCATION_MARKER,
}
