/**
 * fastWrites — deterministic short-circuit for high-confidence write intents.
 * =============================================================================
 * v4 of ORCA must execute "add BTC to my watchlist" with sub-250ms first-turn
 * latency. The LLM router is too slow and too unreliable for these (the
 * writer then has to produce a "Want me to add BTC?" prompt, the client has
 * to render Confirm buttons, the user has to click, and a SECOND request
 * has to wind through the whole pipeline). We replace stage-1 entirely
 * for messages that match an unambiguous write pattern.
 *
 * Output shape mirrors {@link ConfirmPayload} consumed by the route handler:
 * the orchestrator returns short prose + a confirm payload; the client
 * renders Confirm/Cancel buttons; clicking Confirm POSTs `{confirm:{calls}}`
 * and the planner runs the actual write tool.
 *
 * See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §5.1.
 *
 * This module is pure and deterministic. No I/O, no LLM, no Supabase.
 */
import type { ToolCall } from './types'

export interface ConfirmCall extends ToolCall {}

export interface ConfirmPayload {
  /** Human label to show on the affirm button, e.g. "Add BTC to watchlist". */
  label: string
  /**
   * Tool calls the orchestrator would execute if the user confirms.
   * Always wrapped in the {tool, args} shape expected by the planner;
   * the client echoes these back verbatim under `confirm.calls`.
   */
  calls: ConfirmCall[]
}

export interface FastWriteMatch {
  /** Short, human, non-emoji, no-emoji preview of what we'd do. */
  prose: string
  confirm: ConfirmPayload
}

// -----------------------------------------------------------------------------
// Regex table.
// -----------------------------------------------------------------------------
// Patterns are intentionally narrow: they must match natural English of the
// form "add BTC to my watchlist" without bleeding into general phrases like
// "watch out for BTC". The ticker capture group is constrained to 2-8 chars,
// uppercased post-match, and validated against TICKER_BLOCKLIST.
//
// We do NOT try to be smart about ambiguous English. If a user writes
// something the regex misses, the LLM router path still runs.

const TICKER = '[A-Za-z][A-Za-z0-9]{1,7}'

const ADD_WATCHLIST_RE = new RegExp(
  `\\b(?:add|track|watch|follow|put|save)\\s+\\$?(${TICKER})\\b[^\\n]*\\bwatchlist\\b`,
  'i'
)

const REMOVE_WATCHLIST_RE = new RegExp(
  `\\b(?:remove|untrack|unwatch|drop|delete)\\s+\\$?(${TICKER})\\b[^\\n]*\\bwatchlist\\b`,
  'i'
)

/**
 * Words that look like tickers but are pronouns / english fillers. We use
 * this to avoid promoting "ADD THIS TO WATCHLIST" into a write with
 * ticker="THIS".
 */
const TICKER_BLOCKLIST = new Set<string>([
  'THIS', 'THAT', 'IT', 'THE', 'MY', 'A', 'AN', 'TO', 'OF', 'IN', 'ON',
  'WATCHLIST', 'WATCH', 'LIST', 'WALLET', 'ALERT', 'ALERTS', 'PLEASE',
  'SOMETHING', 'ANYTHING', 'EVERYTHING',
])

function normaliseTicker(raw: string): string | null {
  const up = raw.toUpperCase()
  if (TICKER_BLOCKLIST.has(up)) return null
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(up)) return null
  return up
}

/**
 * Detect a deterministic write intent in `message`. Returns null when the
 * LLM router should handle the message normally.
 */
export function detectFastWrite(message: string): FastWriteMatch | null {
  if (typeof message !== 'string') return null
  const m = message.trim()
  if (!m || m.length > 400) return null

  // -- add watchlist --------------------------------------------------------
  const add = ADD_WATCHLIST_RE.exec(m)
  if (add) {
    const ticker = normaliseTicker(add[1])
    if (ticker) {
      return {
        prose:
          `Add ${ticker} to your watchlist? Click Confirm to make the change. ` +
          `This action is reversible.`,
        confirm: {
          label: `Add ${ticker} to watchlist`,
          calls: [{ tool: 'addToWatchlist', args: { ticker } }],
        },
      }
    }
  }

  // -- remove watchlist -----------------------------------------------------
  const rem = REMOVE_WATCHLIST_RE.exec(m)
  if (rem) {
    const ticker = normaliseTicker(rem[1])
    if (ticker) {
      return {
        prose:
          `Remove ${ticker} from your watchlist? Click Confirm to make the change.`,
        confirm: {
          label: `Remove ${ticker} from watchlist`,
          calls: [{ tool: 'removeFromWatchlist', args: { ticker } }],
        },
      }
    }
  }

  // -- track wallet ---------------------------------------------------------
  // Deferred: there is no addWallet write tool yet in the orchestrator.
  // The wallet write path lives in /api/personal/wallets (Watchlist W2) and
  // will be wired into fastWrites in a later branch.

  return null
}
