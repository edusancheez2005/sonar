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
