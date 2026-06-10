/**
 * Planner — Stage 2 of the ORCA orchestrator (§4.C).
 * =============================================================================
 * Deterministic dispatch from intent + datapoints to a typed list of tool
 * calls. No LLM call here.
 *
 * Write-tools (addToWatchlist, removeFromWatchlist, setUserAlert) are NEVER
 * emitted unless `userConfirmed === true`. The router can suggest them via
 * the writer's prose ("Want me to add SOL to your watchlist?") but the
 * client is responsible for sending a confirmation event on the next turn
 * before the planner is allowed to schedule the actual write.
 */
import type {
  Datapoint,
  Intent,
  PlannerInput,
  ToolCall,
  ToolName,
} from './types'

/** Maximum tickers to expand into per-ticker tool calls in one turn. */
const MAX_TICKERS_PER_TURN = 3

/** Static intent → default tool-set map. Per-ticker tools get fanned out below. */
const INTENT_TOOLS: Record<Intent, ToolName[]> = {
  overview: ['getPrice', 'getWhaleFlows', 'getNews'],
  explainer: ['explainMacroFactor', 'getNews'],
  data_query: ['getPrice'],
  followup: ['getPrice'],
  personal: ['getUserHoldings', 'getUserWatchlist', 'getOrcaMemory'],
  compliance_decline: [],
  // W3 — handled with bespoke argument assembly below; the static map
  // is intentionally empty for these because their tool calls depend on
  // entities the router extracted (addresses, urls, etc.).
  wallet_lookup: [],
  article_explain: [],
  signal_explain: [],
}

/** Datapoint → tool overlay (additive, deduped). */
const DATAPOINT_TOOLS: Record<Datapoint, ToolName[]> = {
  price: ['getPrice'],
  whales: ['getWhaleFlows'],
  news: ['getNews'],
  social: ['getSocial'],
  macro: ['explainMacroFactor'],
  portfolio: ['getUserHoldings', 'getUserWatchlist'],
}

const PER_TICKER_TOOLS = new Set<ToolName>([
  'getPrice',
  'getWhaleFlows',
  'getNews',
  'getSocial',
])

const USER_SCOPED_TOOLS = new Set<ToolName>([
  'getUserHoldings',
  'getUserWatchlist',
  'getOrcaMemory',
])

const WRITE_TOOLS = new Set<ToolName>([
  'addToWatchlist',
  'removeFromWatchlist',
  'setUserAlert',
])

export function planToolCalls(input: PlannerInput): ToolCall[] {
  if (input.router.intent === 'compliance_decline') return []

  // W3 — bespoke planners for the agentic intents. They short-circuit
  // the generic intent×datapoint fan-out below.
  if (input.router.intent === 'wallet_lookup') {
    return planWalletLookup(input)
  }
  if (input.router.intent === 'article_explain') {
    return planArticleExplain(input)
  }
  if (input.router.intent === 'signal_explain') {
    return planSignalExplain(input)
  }

  // Fix #2 — followup subject carry-over. When the router labels a short
  // continuation `followup` but the prior turn was about wallets / a signal /
  // an article, `getPrice` is useless. Inherit the prior turn's tools instead.
  if (input.router.intent === 'followup') {
    const carried = planFollowupCarryOver(input)
    if (carried) return carried
  }

  const wanted = new Set<ToolName>(INTENT_TOOLS[input.router.intent])
  for (const dp of input.router.datapoints) {
    for (const t of DATAPOINT_TOOLS[dp] ?? []) wanted.add(t)
  }

  // Personal panel needs user-scoped data regardless of router opinions.
  if (input.router.intent === 'personal') {
    wanted.add('getUserHoldings')
    wanted.add('getUserWatchlist')
  }

  const calls: ToolCall[] = []
  const tickers = input.router.tickers.slice(0, MAX_TICKERS_PER_TURN)

  // Market-wide social momentum ("which tokens are hot by social momentum?").
  // getSocial is per-ticker, so a no-ticker social request would otherwise
  // emit zero tools and the writer would report a missing datapoint. When the
  // user asks for social with no specific ticker, fan in the leaderboard tool.
  if (input.router.datapoints.includes('social') && tickers.length === 0) {
    wanted.delete('getSocial')
    calls.push({ tool: 'getTrendingSocial', args: {} })
  }

  // Market-wide whale flows ("top whale moves this week"). Mirrors the social
  // case: getWhaleFlows is per-ticker, so without a ticker we fan in the
  // market-wide leaderboard. Time-window hint is parsed from the raw message
  // (today / week / month) and defaults to 7d.
  if (input.router.datapoints.includes('whales') && tickers.length === 0) {
    wanted.delete('getWhaleFlows')
    calls.push({
      tool: 'getTrendingWhales',
      args: { window: detectTimeWindow(input.message) },
    })
  }

  // Market-wide news ("what's the latest crypto news?"). getNews is
  // per-ticker and returns invalid_ticker without one, so fan in the
  // market-wide latest-headlines tool when no ticker was named.
  if (input.router.datapoints.includes('news') && tickers.length === 0) {
    wanted.delete('getNews')
    calls.push({ tool: 'getTrendingNews', args: {} })
  }

  // Bare market-overview question ("what's happening in crypto right now")
  // with no ticker and no explicit datapoint — surface both leaderboards so
  // the writer has something concrete to talk about instead of "no data".
  if (
    input.router.intent === 'overview' &&
    tickers.length === 0 &&
    input.router.datapoints.length === 0
  ) {
    if (!calls.some((c) => c.tool === 'getTrendingWhales')) {
      calls.push({
        tool: 'getTrendingWhales',
        args: { window: detectTimeWindow(input.message) },
      })
    }
    if (!calls.some((c) => c.tool === 'getTrendingSocial')) {
      calls.push({ tool: 'getTrendingSocial', args: {} })
    }
    if (!calls.some((c) => c.tool === 'getTrendingNews')) {
      calls.push({ tool: 'getTrendingNews', args: {} })
    }
    // Drop the per-ticker overview defaults — they'd all be no-ops.
    wanted.delete('getPrice')
    wanted.delete('getWhaleFlows')
    wanted.delete('getNews')
  }

  // Fix #4 (§5.1) — give the empty-portfolio personal renderer real market
  // context to pivot to. One cheap leaderboard call (24h whale flows); the
  // renderer only surfaces it when holdings + watchlist come back empty.
  if (input.router.intent === 'personal') {
    calls.push({ tool: 'getTrendingWhales', args: { window: '24h' } })
  }

  for (const tool of wanted) {
    if (WRITE_TOOLS.has(tool)) continue // write-tools must be opted-in explicitly
    if (PER_TICKER_TOOLS.has(tool)) {
      if (tickers.length === 0) continue
      for (const ticker of tickers) {
        calls.push({ tool, args: { ticker } })
      }
    } else if (USER_SCOPED_TOOLS.has(tool)) {
      calls.push({ tool, args: { userId: input.userId } })
    } else if (tool === 'explainMacroFactor') {
      calls.push({ tool, args: { entities: input.router.entities } })
    } else {
      calls.push({ tool, args: {} })
    }
  }

  // Write-tools require an explicit user-confirmation event. Even then they
  // can ONLY be scheduled if the router heard the user reference a ticker
  // (for the watchlist mutations) or an entity (for alerts), AND if the
  // intent is 'personal'. This keeps a confused writer from accidentally
  // mutating data on an unrelated turn.
  if (input.userConfirmed && input.router.intent === 'personal') {
    // We do NOT auto-emit specific write calls here; the route handler
    // attaches them based on the explicit confirmation payload it received.
    // The planner just signals authorisation has been granted upstream.
  }

  return calls
}

/** Exposed for the route handler when it needs to schedule an authorised write. */
export function isWriteTool(tool: ToolName): boolean {
  return WRITE_TOOLS.has(tool)
}

/**
 * Pull a coarse time-window hint out of the raw user message. Returns one of
 * the windows the getTrendingWhales tool understands ('24h' | '7d' | '30d').
 * Defaults to '7d' — the "top whale moves this week" prompt is the most
 * common no-ticker whale query in production.
 */
function detectTimeWindow(message: string | undefined): '24h' | '7d' | '30d' {
  if (!message) return '7d'
  const m = message.toLowerCase()
  if (/\b(today|24h|24 hours?|last day|past day|1d)\b/.test(m)) return '24h'
  if (/\b(this month|past month|last month|30d|30 days?)\b/.test(m)) return '30d'
  if (/\b(this week|past week|last week|7d|7 days?|week)\b/.test(m)) return '7d'
  return '7d'
}

// =============================================================================
// W3 intent-specific planners

const CHAIN_PATTERNS: Array<{ chain: string; test: RegExp }> = [
  { chain: 'eth', test: /^0x[a-fA-F0-9]{40}$/ },
  { chain: 'tron', test: /^T[A-Za-z0-9]{33}$/ },
  { chain: 'btc', test: /^(bc1[a-z0-9]{20,90}|[13][A-HJ-NP-Za-km-z1-9]{25,39})$/ },
  { chain: 'sol', test: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/ },
  { chain: 'xrp', test: /^r[A-Za-z0-9]{24,34}$/ },
]

function guessChain(address: string): string | null {
  for (const { chain, test } of CHAIN_PATTERNS) {
    if (test.test(address)) return chain
  }
  return null
}

function planWalletLookup(input: PlannerInput): ToolCall[] {
  const calls: ToolCall[] = []

  // A follow-up that references a prior ranked wallet table — by rank or by
  // asking for a full/complete address — must re-run the leaderboard so the
  // FULL addresses are back in the renderer's tool context. The user usually
  // pastes the SHORTENED address straight back ("0x51c7…2a7f"), which the
  // router emits as an entity. That truncated string can never be resolved
  // on-chain, so when the leaderboard is wanted we ignore free-text queries
  // entirely and answer from the ranked table.
  const wantsLeaderboard = mentionsMostActiveWallet(input.message)

  const entities = input.router.entities.slice(0, 5)
  const addressLike: Array<{ address: string; chain: string }> = []
  const queries: string[] = []
  for (const e of entities) {
    const trimmed = e.trim()
    if (!trimmed) continue
    // Drop truncated addresses pasted back from a prior table (they contain an
    // ellipsis); they can't be looked up and would otherwise become a junk
    // findTrackedWallets query that masks the leaderboard re-run.
    if (/[…]|\.\.\./.test(trimmed)) continue
    const chain = guessChain(trimmed)
    if (chain) addressLike.push({ address: trimmed, chain })
    else if (!wantsLeaderboard) queries.push(trimmed)
  }

  // Leaderboard first so its full addresses lead the tool context.
  if (wantsLeaderboard) {
    calls.push({
      tool: 'getMostActiveWallets',
      args: { window: detectTimeWindow(input.message) },
    })
  }
  for (const { address, chain } of addressLike) {
    calls.push({
      tool: 'getWalletActivity',
      args: { address, chain, userId: input.userId },
    })
  }
  for (const query of queries) {
    calls.push({
      tool: 'findTrackedWallets',
      args: { query, userId: input.userId },
    })
  }
  if (calls.length === 0) {
    // No specific address, label, or leaderboard intent was extracted. Fall
    // back to listing the user's own tracked wallets.
    calls.push({
      tool: 'findTrackedWallets',
      args: { query: input.router.tickers[0] ?? 'wallet', userId: input.userId },
    })
  }
  return calls
}

/**
 * Detect "which wallet is most active / has the most transactions / is the
 * biggest mover" style questions — market-wide wallet ranking with no address.
 * Also catches follow-ups that reference the previously-shown ranked table by
 * rank or ask for a wallet's full/complete address (e.g. "what's the full
 * address for rank 1?"), so the leaderboard re-runs and the full address is
 * back in the renderer's tool context.
 */
function mentionsMostActiveWallet(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  // Follow-up referencing the ranked table: "full address for rank 1",
  // "rank 2 address", "complete/whole address of the top wallet".
  if (/\brank\s*#?\d+\b/.test(m) && /\b(address|wallet)\b/.test(m)) return true
  if (/\b(full|complete|whole|entire)\s+(wallet\s+)?address\b/.test(m)) return true
  if (!/\b(wallet|address|trader|whale)s?\b/.test(m)) return false
  return /\b(most active|most transactions?|most trades?|biggest|largest|top|busiest|highest volume|most aggressive|best|worth (following|watching)|to (follow|watch|track)|smart money)\b/.test(
    m
  )
}

function planArticleExplain(input: PlannerInput): ToolCall[] {
  const calls: ToolCall[] = []
  for (const e of input.router.entities.slice(0, 3)) {
    const s = e.trim()
    if (!s) continue
    if (/^https?:\/\//i.test(s)) {
      calls.push({ tool: 'getArticleContext', args: { url: s } })
    } else if (/^[A-Za-z0-9_-]{1,64}$/.test(s)) {
      calls.push({ tool: 'getArticleContext', args: { articleId: s } })
    }
  }
  // Also fetch supporting headlines for any tickers the article references.
  for (const t of input.router.tickers.slice(0, MAX_TICKERS_PER_TURN)) {
    calls.push({ tool: 'getNews', args: { ticker: t } })
  }
  return calls
}

function planSignalExplain(input: PlannerInput): ToolCall[] {
  const calls: ToolCall[] = []
  for (const t of input.router.tickers.slice(0, MAX_TICKERS_PER_TURN)) {
    calls.push({ tool: 'getSignalContext', args: { ticker: t } })
    calls.push({ tool: 'getPrice', args: { ticker: t } })
    calls.push({ tool: 'getWhaleFlows', args: { ticker: t } })
  }
  return calls
}

/**
 * Fix #2 — carry the prior turn's subject into a `followup`. The router
 * frequently labels short continuations ("why?", "and the others?") as
 * `followup`, which the static map points at `getPrice`. When the previous
 * assistant turn was a wallet leaderboard, a signal, or an article, that's a
 * non-answer. Re-emit the prior turn's tools so the writer has the right data.
 *
 * Returns null when there is no usable prior subject, so the caller falls back
 * to the existing `getPrice` + datapoint overlay behaviour.
 */
function planFollowupCarryOver(input: PlannerInput): ToolCall[] | null {
  const prior = input.priorIntent
  if (!prior) return null
  const priorTickers = (input.priorTickers ?? []).slice(0, MAX_TICKERS_PER_TURN)

  if (prior === 'wallet_lookup') {
    return [
      {
        tool: 'getMostActiveWallets',
        args: { window: detectTimeWindow(input.message) },
      },
    ]
  }

  if (prior === 'signal_explain' && priorTickers.length > 0) {
    const calls: ToolCall[] = []
    for (const t of priorTickers) {
      calls.push({ tool: 'getSignalContext', args: { ticker: t } })
      calls.push({ tool: 'getPrice', args: { ticker: t } })
    }
    return calls
  }

  if (prior === 'article_explain') {
    if (priorTickers.length > 0) {
      return priorTickers.map((t) => ({ tool: 'getNews', args: { ticker: t } }))
    }
    return [{ tool: 'getTrendingNews', args: {} }]
  }

  return null
}
