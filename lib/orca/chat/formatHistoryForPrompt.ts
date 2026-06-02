/**
 * formatHistoryForPrompt — render prior turns into a writer-prompt block.
 * =============================================================================
 * Conversation Lookback Fix (2026-06-02). Pure + unit-tested.
 *
 * Returns an empty string when there are no turns so callers can safely
 * `[block, ...].filter(Boolean).join('\n\n')`.
 */
import type { RecentTurn } from './loadRecentHistory'

const HEADER = '## PRIOR CONVERSATION TURNS (read-only context, oldest → newest)'

const PREAMBLE =
  'The user is continuing the conversation below. Treat these turns as ' +
  'already-sent; do NOT repeat them verbatim. When the current user message ' +
  'refers to "that", "those", "it", "you said", "the list above", or asks for ' +
  'clarification, RESOLVE the reference to specific items from these turns. ' +
  'Never claim the prior turn did not happen.'

const FOOTER =
  '(End of prior turns. The CURRENT user message follows your instructions.)'

export function formatHistoryForPrompt(turns: RecentTurn[]): string {
  if (!Array.isArray(turns) || turns.length === 0) return ''

  const lines: string[] = []
  let turnNumber = 0
  for (const t of turns) {
    if (!t || typeof t.content !== 'string') continue
    const content = t.content.trim()
    if (!content) continue
    if (t.role === 'user') {
      turnNumber += 1
      lines.push(`[TURN ${turnNumber} — USER] ${content}`)
    } else if (t.role === 'assistant') {
      // Pair the assistant line with the most recent user turn number; if the
      // history starts with an assistant turn, bump to turn 1.
      const n = turnNumber === 0 ? (turnNumber = 1) : turnNumber
      lines.push(`[TURN ${n} — ORCA] ${content}`)
    }
  }

  if (lines.length === 0) return ''

  return [HEADER, PREAMBLE, lines.join('\n'), FOOTER].join('\n\n')
}
