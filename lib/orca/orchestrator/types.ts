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
  | 'getNews'
  | 'getSocial'
  | 'getUserHoldings'
  | 'getUserWatchlist'
  | 'getSignalHistory'
  | 'explainMacroFactor'
  | 'getOrcaMemory'
  // W3 — agentic read-only tools.
  | 'getWalletActivity'
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
   * Set to true by the client when the user has explicitly confirmed an
   * action ORCA offered (e.g. clicked "Yes, add SOL to my watchlist").
   * The planner refuses to enqueue any write-tool when this is false.
   */
  userConfirmed?: boolean
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
   * When present, the route handler should surface a Confirm/Cancel UI to
   * the user. On confirm the client POSTs `{confirm:{calls}}` back to /api/chat
   * and the planner executes those (already-validated) write tool calls.
   * v4 §5.1 (fastWrites short-circuit).
   */
  confirm?: {
    label: string
    calls: ToolCall[]
  }
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
