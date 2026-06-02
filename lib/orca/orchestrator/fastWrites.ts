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
import { parseThreshold } from '../alerts/parseThreshold'
import { detectAddress, type Chain } from './detectAddress'
import { parseDuration } from './parseDuration'

export type WriteTool =
  | 'addToWatchlist'
  | 'removeFromWatchlist'
  | 'createAlert'
  | 'removeAlert'
  | 'listAlerts'
  | 'trackWallet'
  | 'untrackWallet'
  | 'muteTicker'
  | 'unmuteTicker'

/** Alert kinds the chat detector can create (mirrors lib/orca/alerts/types). */
export type FastAlertKind = 'price_move' | 'whale_flow' | 'signal_flip' | 'news_high_impact'

/** Canonical chains accepted by the user_wallets table CHECK constraint. */
export const VALID_CHAINS = new Set<string>([
  'eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp',
])

export interface WriteCallArgs {
  ticker?: string
  kind?: FastAlertKind
  threshold_pct?: number | null
  threshold_usd?: number | null
  // Wallet writes.
  address?: string
  chain?: string
  // Mute writes.
  minutes?: number
}

/** first6…last4 — mirrors the WalletRow.jsx abbreviation. */
export function shortenAddress(addr: string): string {
  if (typeof addr !== 'string' || addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/** Human duration label for the mute confirm card ("24 hours", "3 days"). */
function humanDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '24 hours'
  if (minutes % (7 * 24 * 60) === 0) {
    const w = minutes / (7 * 24 * 60)
    return `${w} week${w === 1 ? '' : 's'}`
  }
  if (minutes % (24 * 60) === 0) {
    const d = minutes / (24 * 60)
    return `${d} day${d === 1 ? '' : 's'}`
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export interface WriteCall {
  tool: WriteTool
  args: WriteCallArgs
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
  'remove', 'delete', 'drop', 'untrack', 'unwatch', 'unadd',
  'stop watching', 'stop tracking', 'take off', 'pull off', 'unfollow',
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

// Pronoun-style tails that the user means as "the ticker we were just
// discussing". Triggers the contextTicker fallback when the tail starts
// with one of these AND the message mentions watchlist.
const PRONOUN_TAIL_RE = /^\s*(it|this|that|them|these|those)\b/i

export interface DetectFastWriteOptions {
  /**
   * Optional ticker resolved from prior conversation context (e.g. the
   * most-recently-discussed token in this session). When the user says
   * "add it to my watchlist" with no explicit ticker, the detector will
   * resolve "it" to this value.
   */
  contextTicker?: string | null
  /**
   * Optional wallet resolved from prior conversation context (e.g. the
   * most-recently-discussed address). When the user says "track this wallet"
   * with no explicit address, the detector resolves the pronoun to this value.
   */
  contextAddress?: { address: string; chain: Chain } | null
}

// ── Alert detection ─────────────────────────────────────────────────────────
// Net-add (Proactive Alerts stage). Detects "alert me when SOL moves 5%",
// "notify me about BTC whale flow over $1M", "ping me on ETH signal flips",
// "tell me about SOL news", plus "remove my SOL alert" and "list my alerts".

const ALERT_INTENT_RE = /\b(alert|notify|ping|tell me|let me know|remind|warn)\b|\balerts?\b/i
const LIST_ALERTS_RE = /\b(list|show|view|see|what(?:'s| is| are)?)\b[^.?!]*\balerts?\b/i
const REMOVE_ALERT_RE = new RegExp(
  `\\b(?:${verbAlternation(['remove', 'delete', 'drop', 'cancel', 'stop', 'disable', 'turn off', 'clear'])})\\b[^.?!]*\\balerts?\\b`,
  'i'
)

// Common English command / filler words that are valid by the ticker regex but
// must never be treated as a symbol when not `$`-prefixed.
const TICKER_STOPWORDS = new Set<string>([
  'ALERT', 'ALERTS', 'NOTIFY', 'PING', 'TELL', 'WARN', 'REMIND', 'LET', 'ME',
  'KNOW', 'WHEN', 'IF', 'ONCE', 'WHENEVER', 'MOVES', 'MOVE', 'MOVING', 'PRICE',
  'WHALE', 'FLOW', 'SIGNAL', 'NEWS', 'BIG', 'OVER', 'UNDER', 'ABOUT', 'ON',
  'THE', 'MY', 'A', 'AN', 'TO', 'AND', 'OR', 'FOR', 'OF', 'IN', 'IS', 'ARE',
  'REMOVE', 'DELETE', 'DROP', 'CANCEL', 'STOP', 'DISABLE', 'CLEAR', 'SHOW',
  'LIST', 'VIEW', 'SEE', 'WHAT', 'IT', 'PLEASE', 'CHANGES', 'CHANGE', 'FLIPS',
  'FLIP', 'FLIPPED', 'GET', 'SET', 'UP', 'DOWN', 'DAY', 'HOUR', 'HOURS',
  'MUTE', 'MUTED', 'SILENCE', 'HIDE', 'SUPPRESS', 'UNMUTE', 'RESUME', 'TRACK',
  'TRACKING', 'UNTRACK', 'WALLET', 'ADDRESS', 'WHALE', 'MINUTE', 'MINUTES',
  'WEEK', 'WEEKS', 'DAYS', 'THIS', 'THAT', 'THEM', 'WK', 'HR', 'HRS',
  'ALERTING', 'PINGING', 'NOTIFYING', 'TELLING', 'SILENCING', 'SUPPRESSING',
])

function pickTickerAnywhere(text: string): string | null {
  const tokens = text.split(/[^A-Za-z0-9.$_-]+/).filter(Boolean)
  for (const tok of tokens) {
    const hadDollar = tok.startsWith('$')
    const bare = tok.replace(/^\$/, '')
    const t = normaliseTicker(bare)
    if (!t) continue
    // A `$`-prefixed symbol is always a ticker. Otherwise reject common English
    // command/filler words and bare numbers so "alert me WHEN SOL moves 8%"
    // doesn't pick "WHEN" or "8".
    if (!hadDollar && (TICKER_STOPWORDS.has(t) || /^\d+$/.test(t))) continue
    return t
  }
  return null
}

function detectAlertKind(msg: string): FastAlertKind | null {
  if (/\b(news|headline|article|story|press)\b/i.test(msg)) return 'news_high_impact'
  if (/\b(signal|rating|flip|flips|flipped)\b/i.test(msg)) return 'signal_flip'
  if (/\bwhale|flow|inflow|outflow|accumulat|net\s*buy|net\s*sell\b/i.test(msg)) return 'whale_flow'
  if (/%|\bpercent\b|\bpct\b|\bprice\b|\bmoves?\b|\bmoving\b|\bdrops?\b|\bjumps?\b|\bgains?\b|\bfalls?\b/i.test(msg)) {
    return 'price_move'
  }
  return null
}

function alertKindLabel(kind: FastAlertKind): string {
  switch (kind) {
    case 'price_move': return 'price move'
    case 'whale_flow': return 'whale flow'
    case 'signal_flip': return 'signal change'
    case 'news_high_impact': return 'high-impact news'
  }
}

/**
 * Detect an alert create/remove/list command. Returns null when the message
 * is not an unambiguous alert command. Thresholds are parsed from the text
 * with sensible per-kind defaults (5% price move, $1M whale flow).
 */
export function detectAlertWrite(
  message: string,
  opts: DetectFastWriteOptions = {}
): FastWriteDetection | null {
  if (typeof message !== 'string') return null
  const msg = message.trim()
  if (!msg || msg.length > 200) return null
  if (!ALERT_INTENT_RE.test(msg)) return null

  const contextTicker = opts.contextTicker ? normaliseTicker(opts.contextTicker) : null

  // LIST — no ticker required. Must not also look like a create ("alert me when").
  if (LIST_ALERTS_RE.test(msg) && !/\b(when|if|once|whenever)\b/i.test(msg)) {
    return { calls: [{ tool: 'listAlerts', args: {} }], label: 'Show your active alerts?' }
  }

  const ticker = pickTickerAnywhere(msg) || contextTicker

  // REMOVE.
  if (REMOVE_ALERT_RE.test(msg)) {
    if (!ticker) return null
    const kind = detectAlertKind(msg)
    return {
      calls: [{ tool: 'removeAlert', args: kind ? { ticker, kind } : { ticker } }],
      label: kind
        ? `Remove the ${alertKindLabel(kind)} alert for ${ticker}?`
        : `Remove your ${ticker} alerts?`,
    }
  }

  // CREATE.
  if (!ticker) return null
  // Guard against plain queries that merely contain a soft verb ("tell me
  // about SOL"). A create requires an explicit alert noun/verb OR a
  // conditional trigger word.
  const hasAlertWord = /\b(alert|notify|ping|warn|remind)\b/i.test(msg)
  const hasTrigger = /\b(when|if|once|whenever)\b/i.test(msg)
  if (!hasAlertWord && !hasTrigger) return null
  const kind = detectAlertKind(msg) || 'price_move'
  const parsed = parseThreshold(msg)
  let threshold_pct: number | null = null
  let threshold_usd: number | null = null
  if (kind === 'price_move') {
    threshold_pct = parsed?.threshold_pct ?? 5
  } else if (kind === 'whale_flow') {
    threshold_usd = parsed?.threshold_usd ?? 1_000_000
  }

  const args: WriteCallArgs = { ticker, kind }
  if (threshold_pct != null) args.threshold_pct = threshold_pct
  if (threshold_usd != null) args.threshold_usd = threshold_usd

  let label: string
  if (kind === 'price_move') label = `Alert you when ${ticker} moves ${threshold_pct}% in 24h?`
  else if (kind === 'whale_flow') {
    const m = (threshold_usd ?? 0) >= 1_000_000
      ? `$${((threshold_usd ?? 0) / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
      : `$${Math.round((threshold_usd ?? 0) / 1000)}K`
    label = `Alert you on ${ticker} whale flow over ${m}?`
  } else if (kind === 'signal_flip') label = `Alert you when the ${ticker} signal changes?`
  else label = `Alert you on high-impact ${ticker} news?`

  return { calls: [{ tool: 'createAlert', args }], label }
}

// ── Wallet detection ────────────────────────────────────────────────────────
// "track this wallet 0xabc…", "watch 0xabc on base", "stop tracking 0xabc",
// "untrack bc1q…". Requires a detectable address (or contextAddress pronoun
// fallback). Untrack phrases take precedence over the shared "track"/"watch".

const WALLET_UNTRACK_RE = /\b(untrack|stop\s+tracking|stop\s+watching|stop\s+following|unfollow|forget|remove|drop)\b/i
const WALLET_TRACK_RE = /\b(track|watch|follow|monitor|save|add)\b/i
const WALLET_PRONOUN_RE = /\b(this|that|the|it|wallet|address)\b/i

export function detectWalletWrite(
  message: string,
  opts: DetectFastWriteOptions = {}
): FastWriteDetection | null {
  if (typeof message !== 'string') return null
  const msg = message.trim()
  if (!msg || msg.length > 200) return null

  const hasUntrack = WALLET_UNTRACK_RE.test(msg)
  const hasTrack = WALLET_TRACK_RE.test(msg)
  if (!hasUntrack && !hasTrack) return null

  let detected = detectAddress(msg)
  // Pronoun fallback — "track this wallet" with a context address.
  if (!detected && opts.contextAddress && WALLET_PRONOUN_RE.test(msg)) {
    detected = opts.contextAddress
  }
  if (!detected) return null

  const { address, chain } = detected
  const short = shortenAddress(address)

  if (hasUntrack) {
    return {
      calls: [{ tool: 'untrackWallet', args: { address, chain } }],
      label: `Stop tracking ${short} on ${chain}?`,
    }
  }
  return {
    calls: [{ tool: 'trackWallet', args: { address, chain } }],
    label: `Track wallet ${short} on ${chain}?`,
  }
}

// ── Mute detection ──────────────────────────────────────────────────────────
// "mute SOL alerts for 3 days", "silence BTC", "stop alerting me on ETH",
// "unmute SOL". Unmute takes precedence. Duration defaults to 24h.

const MUTE_RE = /\b(mute|silence|suppress|stop\s+alerting|stop\s+pinging|stop\s+notifying|stop\s+telling)\b/i
const UNMUTE_RE = /\b(unmute|unsilence|un-?mute|stop\s+muting|resume\s+alerts?|unsuppress)\b/i

export function detectMuteWrite(
  message: string,
  opts: DetectFastWriteOptions = {}
): FastWriteDetection | null {
  if (typeof message !== 'string') return null
  const msg = message.trim()
  if (!msg || msg.length > 200) return null

  const contextTicker = opts.contextTicker ? normaliseTicker(opts.contextTicker) : null

  if (UNMUTE_RE.test(msg)) {
    const ticker = pickTickerAnywhere(msg) || contextTicker
    if (!ticker) return null
    return {
      calls: [{ tool: 'unmuteTicker', args: { ticker } }],
      label: `Unmute ${ticker} alerts?`,
    }
  }

  if (MUTE_RE.test(msg)) {
    const ticker = pickTickerAnywhere(msg) || contextTicker
    if (!ticker) return null
    const minutes = parseDuration(msg)
    return {
      calls: [{ tool: 'muteTicker', args: { ticker, minutes } }],
      label: `Mute ${ticker} alerts for ${humanDuration(minutes)}?`,
    }
  }

  return null
}

export function detectFastWrite(
  message: string,
  opts: DetectFastWriteOptions = {}
): FastWriteDetection | null {
  if (typeof message !== 'string') return null
  const msg = message.trim()
  if (!msg) return null
  // Hard cap: long messages are unlikely to be one-shot write commands.
  if (msg.length > 200) return null

  // Alert commands take precedence — "track SOL alert" should create an alert,
  // not add SOL to the watchlist. detectAlertWrite returns null for non-alert
  // text, so watchlist detection still runs below.
  const alert = detectAlertWrite(msg, opts)
  if (alert) return alert

  // Wallet track/untrack — requires a detectable address, so it never fires on
  // plain watchlist/ticker text. Runs before watchlist add so "track 0xabc"
  // tracks a wallet rather than trying to add "0XABC" as a ticker.
  const wallet = detectWalletWrite(msg, opts)
  if (wallet) return wallet

  // Mute/unmute — requires a mute verb, so it never fires on watchlist text.
  const mute = detectMuteWrite(msg, opts)
  if (mute) return mute

  const isExplicitWatchlist = /\bwatch\s*list\b|\bwatchlist\b/i.test(msg)
  const contextTicker = opts.contextTicker
    ? normaliseTicker(opts.contextTicker)
    : null

  // Try REMOVE first — some remove verbs ("stop watching") share a substring
  // with add verbs ("watch") and we want the longer phrase to win.
  const removeRe = new RegExp(
    `\\b(?:${verbAlternation(REMOVE_VERBS)})\\b\\s+(.+)`,
    'i'
  )
  const removeMatch = msg.match(removeRe)
  if (removeMatch) {
    const tail = removeMatch[1] || ''
    let ticker = pickTickerFromTail(tail)
    if (!ticker && contextTicker && isExplicitWatchlist && PRONOUN_TAIL_RE.test(tail)) {
      ticker = contextTicker
    }
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
    const verb = (addMatch[0].match(new RegExp(verbAlternation(ADD_VERBS), 'i')) || [''])[0].toLowerCase()
    const generic = /^(save|put|follow|pin)$/.test(verb.trim())
    if (generic && !isExplicitWatchlist) return null

    let ticker = pickTickerFromTail(tail)
    if (!ticker && contextTicker && isExplicitWatchlist && PRONOUN_TAIL_RE.test(tail)) {
      ticker = contextTicker
    }
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
    const argsRaw = (raw as any).args

    if (tool === 'addToWatchlist' || tool === 'removeFromWatchlist') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const ticker = normaliseTicker(String(argsRaw.ticker || ''))
      if (!ticker) continue
      out.push({ tool, args: { ticker } })
    } else if (tool === 'listAlerts') {
      out.push({ tool, args: {} })
    } else if (tool === 'removeAlert') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const ticker = normaliseTicker(String(argsRaw.ticker || ''))
      if (!ticker) continue
      const kind = ALERT_KIND_SET.has(argsRaw.kind) ? (argsRaw.kind as FastAlertKind) : undefined
      out.push({ tool, args: kind ? { ticker, kind } : { ticker } })
    } else if (tool === 'createAlert') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const ticker = normaliseTicker(String(argsRaw.ticker || ''))
      if (!ticker) continue
      if (!ALERT_KIND_SET.has(argsRaw.kind)) continue
      const kind = argsRaw.kind as FastAlertKind
      const args: WriteCallArgs = { ticker, kind }
      if (kind === 'price_move') {
        const pct = Number(argsRaw.threshold_pct)
        if (Number.isFinite(pct) && pct > 0) args.threshold_pct = pct
      } else if (kind === 'whale_flow') {
        const usd = Number(argsRaw.threshold_usd)
        if (Number.isFinite(usd) && usd > 0) args.threshold_usd = Math.round(usd)
      }
      out.push({ tool, args })
    } else if (tool === 'trackWallet' || tool === 'untrackWallet') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const address = String(argsRaw.address || '').trim()
      const chain = String(argsRaw.chain || '').trim().toLowerCase()
      if (!VALID_CHAINS.has(chain)) continue
      // Conservative address charset; length 4–128 mirrors the wallets route.
      if (!/^[A-Za-z0-9._:-]+$/.test(address)) continue
      if (address.length < 4 || address.length > 128) continue
      out.push({ tool, args: { address, chain } })
    } else if (tool === 'muteTicker') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const ticker = normaliseTicker(String(argsRaw.ticker || ''))
      if (!ticker) continue
      let minutes = Math.round(Number(argsRaw.minutes))
      if (!Number.isFinite(minutes) || minutes <= 0) minutes = 24 * 60
      const MIN = 5
      const MAX = 30 * 24 * 60
      if (minutes < MIN) minutes = MIN
      if (minutes > MAX) minutes = MAX
      out.push({ tool, args: { ticker, minutes } })
    } else if (tool === 'unmuteTicker') {
      if (!argsRaw || typeof argsRaw !== 'object') continue
      const ticker = normaliseTicker(String(argsRaw.ticker || ''))
      if (!ticker) continue
      out.push({ tool, args: { ticker } })
    } else {
      continue
    }
    if (out.length >= 4) break // hard cap: a confirm trip never executes more than 4 calls
  }
  return out.length > 0 ? out : null
}

const ALERT_KIND_SET = new Set<string>(['price_move', 'whale_flow', 'signal_flip', 'news_high_impact'])
