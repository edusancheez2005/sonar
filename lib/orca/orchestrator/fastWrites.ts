/**
 * Fast writes — Stage B.2 (2026-05-26)
 * =============================================================================
 * Pure detector for simple watchlist mutation utterances. Lets ORCA chat
 * intercept "add SOL to my watchlist" / "remove BTC" / "track ETH" /
 * "unwatch DOGE" style commands BEFORE the router and writer LLMs are
 * invoked, so the user can execute a quick write via a Confirm / Cancel
 * affordance without burning a full chat turn.
 *
 * Contract:
 *  - Returns `null` when the message is not an unambiguous single-ticker
 *    add/remove command.
 *  - Returns `{ calls, label }` when it is. `label` is a short, neutral
 *    human-readable string the UI uses for the confirm prompt.
 *
 * Hard rules (consistent with HARD RULE #4 and ORCA write-tool contracts):
 *  - This module never touches Supabase. It only parses the user's text.
 *  - Tickers are validated against the same `/^[A-Z0-9._-]{1,12}$/` regex
 *    that `writeTools.ts` enforces server-side. The route handler must
 *    re-validate everything before any actual mutation.
 *  - `userId` is intentionally NOT part of any call's args here; the route
 *    handler injects it from the verified JWT at execution time.
 */

export type WriteTool = 'addToWatchlist' | 'removeFromWatchlist'

export interface WriteCall {
  tool: WriteTool
  args: { ticker: string }
}

export interface FastWriteDetection {
  /** One or more tool calls to execute on user confirmation. */
  calls: WriteCall[]
  /** Short, neutral prompt the UI renders next to the Confirm / Cancel buttons. */
  label: string
}

const TICKER_RE = /^[A-Z0-9._-]{1,12}$/

// Phrases that flip the intent from add → remove.
const REMOVE_VERBS = [
  'remove', 'delete', 'drop', 'untrack', 'unwatch', 'stop watching',
  'stop tracking', 'take off', 'pull off', 'unfollow',
]
const ADD_VERBS = [
  'add', 'watch', 'track', 'save', 'put', 'follow', 'pin',
]

// The set of tokens that should NOT be treated as tickers even if they look
// like one. Avoid hijacking ordinary requests like "remove that note".
const STOPWORDS = new Set([
  'IT', 'THIS', 'THAT', 'THAT.', 'THE', 'A', 'AN', 'MY', 'YOUR',
  'ME', 'US', 'ALL', 'EVERYTHING', 'NOTE', 'ALERT', 'MEMORY',
  'WALLET', 'WATCHLIST', 'LIST', 'PLEASE', 'PLS', 'THX', 'THANKS',
  'TO', 'FROM', 'ON', 'OFF', 'OF', 'AND', 'OR', 'BUT',
])

function normaliseTicker(raw: string): string | null {
  if (!raw) return null
  const t = raw.trim().replace(/[.,!?;:]+$/g, '').toUpperCase()
  if (!t || STOPWORDS.has(t)) return null
  if (!TICKER_RE.test(t)) return null
  return t
}

/**
 * Build a regex matching any verb-phrase from `verbs`, escaping any
 * RegExp-meta characters and joining with `|`. Verbs are matched on word
 * boundaries case-insensitively.
 */
function verbAlternation(verbs: string[]): string {
  return verbs
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|')
}

/**
 * Try to find a single ticker in `tail` (the text immediately after a verb
 * phrase). Accepts patterns like:
 *   "SOL to my watchlist"
 *   "SOL from watchlist"
 *   "$SOL"
 *   "SOL please"
 *   "SOL."
 */
function pickTickerFromTail(tail: string): string | null {
  if (!tail) return null
  // Strip an optional leading "$"
  const cleaned = tail.replace(/^\s*\$/, ' ').trim()
  // Take the first whitespace-delimited token
  const first = cleaned.split(/\s+/)[0] || ''
  return normaliseTicker(first)
}

export function detectFastWrite(message: string): FastWriteDetection | null {
  if (typeof message !== 'string') return null
  const msg = message.trim()
  if (!msg) return null
  // Hard cap: long messages are unlikely to be one-shot write commands.
  if (msg.length > 200) return null

  // Try REMOVE first — some remove verbs ("stop watching") share a substring
  // with add verbs ("watch") and we want the longer phrase to win.
  const removeRe = new RegExp(
    `\\b(?:${verbAlternation(REMOVE_VERBS)})\\b\\s+(.+)`,
    'i'
  )
  const removeMatch = msg.match(removeRe)
  if (removeMatch) {
    const ticker = pickTickerFromTail(removeMatch[1] || '')
    if (ticker) {
      return {
        calls: [{ tool: 'removeFromWatchlist', args: { ticker } }],
        label: `Remove ${ticker} from your watchlist?`,
      }
    }
  }

  const addRe = new RegExp(
    `\\b(?:${verbAlternation(ADD_VERBS)})\\b\\s+(.+)`,
    'i'
  )
  const addMatch = msg.match(addRe)
  if (addMatch) {
    const tail = addMatch[1] || ''
    // Guard: require explicit watchlist context for the more generic
    // verbs ("save", "put", "pin", "follow") to avoid false positives like
    // "save my work" or "put it on hold".
    const isExplicitWatchlist = /\bwatch\s*list\b|\bwatchlist\b/i.test(msg)
    const verb = (addMatch[0].match(new RegExp(verbAlternation(ADD_VERBS), 'i')) || [''])[0].toLowerCase()
    const generic = /^(save|put|follow|pin)$/.test(verb.trim())
    if (generic && !isExplicitWatchlist) return null

    const ticker = pickTickerFromTail(tail)
    if (ticker) {
      return {
        calls: [{ tool: 'addToWatchlist', args: { ticker } }],
        label: `Add ${ticker} to your watchlist?`,
      }
    }
  }

  return null
}

/**
 * Server-side validator for a confirm-trip `calls[]` array. Mirrors the
 * shape returned by `detectFastWrite` but is intentionally re-implemented
 * here so the route handler does NOT trust the client to send back the
 * same calls. Untrusted input goes in; a clean list (or null) comes out.
 */
export function sanitiseConfirmCalls(input: unknown): WriteCall[] | null {
  if (!Array.isArray(input)) return null
  const out: WriteCall[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const tool = (raw as any).tool
    if (tool !== 'addToWatchlist' && tool !== 'removeFromWatchlist') continue
    const argsRaw = (raw as any).args
    if (!argsRaw || typeof argsRaw !== 'object') continue
    const ticker = normaliseTicker(String(argsRaw.ticker || ''))
    if (!ticker) continue
    out.push({ tool, args: { ticker } })
    if (out.length >= 4) break // hard cap: a confirm trip never executes more than 4 calls
  }
  return out.length > 0 ? out : null
}
