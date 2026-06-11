/**
 * Tool catalogue — the ONLY description of tools the agentic loop may pick.
 * =============================================================================
 * §6.3 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md.
 *
 * Every entry's `name` is a `ToolName` AND must be a READ-ONLY tool (enforced
 * by test/orchestrator/toolCatalogue.test.ts against the registry's
 * READ_ONLY_TOOLS set). Write tools (addToWatchlist, setUserAlert, …) are NOT
 * present here, so they are physically unrepresentable in an agentic plan — the
 * worst a bad plan can do is fetch the wrong read data.
 *
 * `userId` is injected by the executor for user-scoped tools; the planner never
 * supplies it.
 */
import type { ToolName } from './types'

export interface ToolSpec {
  name: ToolName
  /** One line the planner reads. */
  purpose: string
  /** arg -> short type/desc, e.g. { ticker: 'string, e.g. "BTC"' }. */
  args: Record<string, string>
  /** True if it works with no ticker (market-wide). */
  marketWide?: boolean
  /** Hint to discourage over-fetching. */
  cost: 'cheap' | 'medium'
}

export const TOOL_CATALOGUE: ToolSpec[] = [
  { name: 'getPrice', purpose: 'Spot price, 24h change, volume for ONE ticker.', args: { ticker: 'string, e.g. "BTC"' }, cost: 'cheap' },
  { name: 'getWhaleFlows', purpose: 'Net whale buy/sell flow for ONE ticker over a window.', args: { ticker: 'string', window: '"24h"|"7d"|"30d"' }, cost: 'medium' },
  { name: 'getTrendingWhales', purpose: 'Market-wide whale-flow leaderboard (no ticker needed).', args: { window: '"24h"|"7d"|"30d"' }, marketWide: true, cost: 'medium' },
  { name: 'getMostActiveWallets', purpose: 'Ranked most-active wallets (no ticker needed).', args: { window: '"24h"|"7d"|"30d"' }, marketWide: true, cost: 'medium' },
  { name: 'getWalletActivity', purpose: 'Recent activity for ONE wallet address.', args: { address: 'string', chain: 'string' }, cost: 'medium' },
  { name: 'getNews', purpose: 'Recent headlines for ONE ticker.', args: { ticker: 'string' }, cost: 'cheap' },
  { name: 'getTrendingNews', purpose: 'Market-wide latest headlines (no ticker needed).', args: {}, marketWide: true, cost: 'cheap' },
  { name: 'getSocial', purpose: 'Social momentum/sentiment for ONE ticker.', args: { ticker: 'string' }, cost: 'medium' },
  { name: 'getTrendingSocial', purpose: 'Market-wide social-momentum leaderboard.', args: {}, marketWide: true, cost: 'medium' },
  { name: 'getMacroFactors', purpose: 'Live macro factors affecting crypto this week.', args: {}, marketWide: true, cost: 'cheap' },
  { name: 'explainMacroFactor', purpose: 'Definition of a named macro term (CPI, FOMC, ETF…).', args: { entities: 'string[]' }, cost: 'cheap' },
  { name: 'getSignalContext', purpose: 'Current Sonar signal + why, for ONE ticker.', args: { ticker: 'string' }, cost: 'medium' },
  { name: 'getArticleContext', purpose: 'Fetch a specific article by url or id.', args: { url: 'string?', articleId: 'string?' }, cost: 'cheap' },
  { name: 'findTrackedWallets', purpose: "Search the user's tracked wallets by label/query.", args: { query: 'string' }, cost: 'cheap' },
  { name: 'getUserHoldings', purpose: "The signed-in user's holdings.", args: {}, cost: 'cheap' },
  { name: 'getUserWatchlist', purpose: "The signed-in user's watchlist.", args: {}, cost: 'cheap' },
  { name: 'getOrcaMemory', purpose: 'Stored facts ORCA remembered about this user.', args: {}, cost: 'cheap' },
]

/** O(1) membership set of catalogue tool names (used by validateCalls). */
export const TOOL_CATALOGUE_NAMES: ReadonlySet<ToolName> = new Set(
  TOOL_CATALOGUE.map((t) => t.name)
)

/** Map of name → spec for arg-key coercion. */
export const TOOL_CATALOGUE_BY_NAME: ReadonlyMap<ToolName, ToolSpec> = new Map(
  TOOL_CATALOGUE.map((t) => [t.name, t])
)

/** Per-ticker tools the planner must not request without a `ticker` arg. */
export const CATALOGUE_PER_TICKER_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
  'getPrice',
  'getWhaleFlows',
  'getNews',
  'getSocial',
  'getSignalContext',
])

/**
 * Render the catalogue as a compact numbered list for the planner system
 * prompt. Keeps token cost low while giving the model the name, purpose, args,
 * and a market-wide hint per tool.
 */
export function catalogueForPrompt(): string {
  return TOOL_CATALOGUE.map((t, i) => {
    const argKeys = Object.keys(t.args)
    const argsStr = argKeys.length
      ? argKeys.map((k) => `${k}: ${t.args[k]}`).join(', ')
      : 'none'
    const tags = [t.marketWide ? 'market-wide' : 'per-ticker', t.cost].join(', ')
    return `${i + 1}. ${t.name} (${tags}) — ${t.purpose} args: { ${argsStr} }`
  }).join('\n')
}
