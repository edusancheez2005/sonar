/**
 * Orchestrator shared types
 * =============================================================================
 * Step 4.C of ORCA_COPILOT_BUILD_PROMPT.md.
 */

export type Intent =
  | 'overview'
  | 'explainer'
  | 'data_query'
  | 'followup'
  | 'personal'
  | 'compliance_decline'
  // W3 — agentic intents for the personal copilot.
  | 'wallet_lookup'
  | 'article_explain'
  | 'signal_explain'

export type Datapoint =
  | 'price'
  | 'whales'
  | 'news'
  | 'social'
  | 'macro'
  | 'portfolio'

export type Persona = 'new' | 'intermediate' | 'advanced'

export interface RouterDecision {
  intent: Intent
  tickers: string[]
  entities: string[]
  datapoints: Datapoint[]
  persona_hint: Persona | null
  confidence: number
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface RouterInput {
  message: string
  userId: string
  chatHistory: ChatTurn[]
}

// =============================================================================
// Tools

export type ToolName =
  | 'getPrice'
  | 'getWhaleFlows'
  | 'getTrendingWhales'
  | 'getNews'
  | 'getTrendingNews'
  | 'getSocial'
  | 'getTrendingSocial'
  | 'getUserHoldings'
  | 'getUserWatchlist'
  | 'getSignalHistory'
  | 'explainMacroFactor'
  | 'getOrcaMemory'
  // W3 — agentic read-only tools.
  | 'getWalletActivity'
  | 'getMostActiveWallets'
  | 'getArticleContext'
  | 'getSignalContext'
  | 'findTrackedWallets'
  // write-tools — only callable when the request carries an explicit
  // user-confirmation event (see planner.ts guard).
  | 'addToWatchlist'
  | 'removeFromWatchlist'
  | 'setUserAlert'

export interface ToolCall {
  tool: ToolName
  args: Record<string, unknown>
}

export interface ToolResult {
  ok: boolean
  data: unknown
  source: string
  fetched_at: string
  error?: string
}

// =============================================================================
// Planner & writer

export interface UserProfileSnapshot {
  user_id: string
  experience_level: Persona | null
  primary_goal: string | null
  risk_tolerance: 'conservative' | 'balanced' | 'aggressive' | null
  time_horizon: string | null
  preferred_chains: string[] | null
}

export interface PlannerInput {
  router: RouterDecision
  profile: UserProfileSnapshot | null
  userId: string
  /**
   * Raw user message — exposed so the planner can pull lightweight hints
   * (e.g. "this week" → 7d window for getTrendingWhales) without re-running
   * the router.
   */
  message?: string
  /**
   * Set to true by the client when the user has explicitly confirmed an
   * action ORCA offered (e.g. clicked "Yes, add SOL to my watchlist").
   * The planner refuses to enqueue any write-tool when this is false.
   */
  userConfirmed?: boolean
  /**
   * Subject of the most recent assistant turn, carried forward so a
   * `followup` intent inherits the right tools (e.g. a wallet leaderboard
   * follow-up re-emits getMostActiveWallets instead of a useless getPrice).
   */
  priorIntent?: Intent
  /** Tickers surfaced on the previous turn, used with priorIntent above. */
  priorTickers?: string[]
}

export interface WriterInput {
  intent: Intent
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
  profile: UserProfileSnapshot | null
  message: string
  chatHistory: ChatTurn[]
}

export interface OrchestratorOutput {
  text: string
  intent: Intent
  trace: TraceEvent[]
  /**
   * Full wallet addresses surfaced to the user this turn, most-prominent
   * first. Persisted to chat_history so the next turn can resolve pronoun
   * writes like "track this wallet" (chat text only ever shows the
   * shortened 0x51c7…2a7f form, which detectAddress cannot parse).
   */
  walletAddresses?: string[]
}

export interface TraceEvent {
  stage: 'router' | 'planner' | 'tool' | 'writer' | 'guardrails' | 'orchestrator'
  payload: Record<string, unknown>
  latency_ms?: number
  model?: string
}

// =============================================================================
// Dependency-injected clients (test-friendly)

export interface ModelClient {
  routerCall: (prompt: string, userMessage: string) => Promise<string>
  writerCall: (systemPrompt: string, userMessage: string) => Promise<string>
}

export interface SupabaseLike {
  from: (table: string) => any
}
