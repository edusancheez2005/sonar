/**
 * agenticPlanner — the bounded, agentic tool-calling loop (§6).
 * =============================================================================
 * Replaces the static `planToolCalls` step with an LLM-driven loop that plans
 * READ-ONLY tools, observes the results, and decides whether to answer or fetch
 * more — capped at MAX_HOPS planning hops to stay inside the 60s budget.
 *
 * Compliance-safe by construction (§6.7):
 *  - The loop can ONLY schedule tools present in TOOL_CATALOGUE, which contains
 *    read-only tools only. Write tools are physically unrepresentable.
 *  - The planner's `thought` is traced but NEVER shown to the user.
 *  - The writer + applyGuardrails stages downstream are unchanged.
 *  - Worst-case bad plan → wrong/empty data → honest "I don't have that".
 *
 * Deterministic fallback (§6.8): when the planner yields nothing usable (parse
 * failure on every hop, or zero results), we fall back to planToolCalls so the
 * user always gets an answer. (Absence of `plannerCall` is handled upstream in
 * runOrchestrator, which only enters this loop when one is present.)
 */
import { planToolCalls } from './planner'
import { executeTool } from './tools/registry'
import {
  CATALOGUE_PER_TICKER_TOOLS,
  TOOL_CATALOGUE_BY_NAME,
  TOOL_CATALOGUE_NAMES,
  catalogueForPrompt,
} from './toolCatalogue'
import { formatProfileBlock } from '../renderers/shared'
import { formatHistoryForPrompt } from '../chat/formatHistoryForPrompt'
import type {
  AgenticHopPlan,
  ChatTurn,
  ModelClient,
  RouterDecision,
  SupabaseLike,
  ToolCall,
  ToolName,
  ToolResult,
  TraceEvent,
  UserProfileSnapshot,
} from './types'

/** Hard cap on planning LLM hops (§2 rule 8 — 60s budget). */
export const MAX_HOPS = 2
/** Hard cap on tool calls per hop (§6.5 validateCalls). */
export const MAX_CALLS_PER_HOP = 5

/** Tools that must be given the verified userId by the executor, not the LLM. */
const USER_SCOPED_TOOLS = new Set<ToolName>([
  'getUserHoldings',
  'getUserWatchlist',
  'getOrcaMemory',
  'findTrackedWallets',
  'getWalletActivity',
])

export const AGENTIC_PLANNER_SYSTEM = `You are the PLANNING layer of an AI crypto research copilot called ORCA. You select READ-ONLY data tools to answer a crypto research question. You do NOT write the user-facing answer and you do NOT give advice.

Return ONLY a JSON object with EXACTLY this shape — no prose, no markdown:
{ "thought": string, "tool_calls": [{ "tool": string, "args": object }], "done": boolean }

Rules:
- Pick the FEWEST tools that answer the question. Prefer ONE market-wide tool over many per-ticker calls.
- NEVER request a per-ticker tool (getPrice, getWhaleFlows, getNews, getSocial, getSignalContext) without a "ticker" arg.
- You will be called at most twice. On the second call, set "done": true unless a single critical datapoint is still missing.
- If the user is following up on the prior turn, REUSE the same tools/subject as that turn (the prior turns are provided).
- WINDOW CARRY: keep the SAME time window as the prior turn unless the user explicitly changes it. If the previous turn was about "this week" (7d), use window "7d" again — do NOT silently drop to "24h".
- BUYERS / SELLERS: "who were the biggest sellers/buyers?" about ONE token → getWhaleFlows with that ticker + the carried window (it returns the top individual buy/sell transactions). About the WHOLE market (e.g. a follow-up to a market-wide whale table) → getTrendingWhales for the same window and read the sell side of the leaderboard. When unsure whether they mean the single token or the whole market, fetch BOTH.
- ZOOM OUT: if the prior turn drilled into one token but the new question is clearly market-wide again ("which had the most selling", "across all of them"), use the market-wide tool, not the single ticker.
- Only choose tools from the catalogue below. Do not invent tool names. Never request any tool that writes or changes data.
- "thought" is a brief internal note on why these tools; it is never shown to the user.`

export interface AgenticPlanInput {
  router: RouterDecision
  profile: UserProfileSnapshot | null
  userId: string
  message: string
  chatHistory: ChatTurn[]
}

export interface AgenticPlanDeps {
  supabase: SupabaseLike
  model: ModelClient
  now: () => Date
}

/**
 * Stable key for dedupe: `${tool}:${stableStringify(args)}`.
 */
function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  const pairs = keys.map((k) => `${k}:${JSON.stringify(obj[k])}`)
  return `{${pairs.join(',')}}`
}

function callKey(c: ToolCall): string {
  return `${c.tool}:${stableStringify(c.args ?? {})}`
}

/**
 * Safe JSON parse of a planner hop. Returns an empty plan ({}) on any failure
 * so a garbage hop degrades gracefully instead of throwing.
 */
export function parseAgenticPlan(raw: unknown): AgenticHopPlan {
  const empty: AgenticHopPlan = { thought: '', tool_calls: [], done: false }
  if (typeof raw !== 'string') return empty
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const body = fenced ? fenced[1] : trimmed
  let obj: any
  try {
    obj = JSON.parse(body)
  } catch {
    return empty
  }
  if (!obj || typeof obj !== 'object') return empty
  const thought = typeof obj.thought === 'string' ? obj.thought : ''
  const done = obj.done === true
  const tool_calls: ToolCall[] = []
  if (Array.isArray(obj.tool_calls)) {
    for (const c of obj.tool_calls) {
      if (!c || typeof c !== 'object') continue
      if (typeof c.tool !== 'string') continue
      const args = c.args && typeof c.args === 'object' && !Array.isArray(c.args) ? c.args : {}
      tool_calls.push({ tool: c.tool as ToolName, args })
    }
  }
  return { thought, tool_calls, done }
}

/**
 * Validate + sanitise a hop's tool calls (§6.5):
 *  - drop any tool not in TOOL_CATALOGUE (write tools + typos vanish)
 *  - coerce args down to the keys the catalogue declares for that tool
 *  - drop per-ticker tools whose `ticker` arg is missing
 *  - enforce ≤ MAX_CALLS_PER_HOP calls per hop
 */
export function validateCalls(calls: ToolCall[]): ToolCall[] {
  const out: ToolCall[] = []
  for (const c of calls) {
    if (!c || typeof c.tool !== 'string') continue
    const name = c.tool as ToolName
    const spec = TOOL_CATALOGUE_BY_NAME.get(name)
    if (!spec || !TOOL_CATALOGUE_NAMES.has(name)) continue // not a read-only catalogue tool
    const rawArgs = (c.args && typeof c.args === 'object' ? c.args : {}) as Record<string, unknown>
    const allowed = Object.keys(spec.args)
    const args: Record<string, unknown> = {}
    for (const k of allowed) {
      if (rawArgs[k] === undefined || rawArgs[k] === null) continue
      if (k === 'ticker' && typeof rawArgs[k] === 'string') {
        const t = (rawArgs[k] as string).trim().toUpperCase()
        if (t) args[k] = t
      } else {
        args[k] = rawArgs[k]
      }
    }
    // Per-ticker tools require a ticker.
    if (CATALOGUE_PER_TICKER_TOOLS.has(name) && typeof args.ticker !== 'string') continue
    out.push({ tool: name, args })
    if (out.length >= MAX_CALLS_PER_HOP) break
  }
  return out
}

/** Inject the verified userId into user-scoped tool calls (never from the LLM). */
function injectUserId(call: ToolCall, userId: string): ToolCall {
  if (USER_SCOPED_TOOLS.has(call.tool)) {
    return { tool: call.tool, args: { ...call.args, userId } }
  }
  return call
}

/**
 * A small, token-cheap digest of hop-1 results for the hop-2 prompt. Never the
 * full payload — just {tool, ok, error?, a few shape hints}.
 */
export function compactDigest(
  results: Array<{ call: ToolCall; result: ToolResult }>
): string {
  const items = results.map(({ call, result }) => {
    const entry: Record<string, unknown> = { tool: call.tool, ok: result.ok }
    if (!result.ok) {
      entry.error = result.error ?? 'unknown'
      return entry
    }
    const d = result.data as any
    if (d && typeof d === 'object') {
      if (Array.isArray(d.tokens)) entry.tokens = d.tokens.slice(0, 5).map((t: any) => t?.ticker).filter(Boolean)
      if (Array.isArray(d.wallets)) entry.wallets = d.wallets.length
      if (Array.isArray(d.items)) entry.headlines = d.items.length
      if (Array.isArray(d.matches)) entry.matches = d.matches.length
      if (Array.isArray(d.factors)) entry.factors = d.factors.length
      if (typeof d.ticker === 'string') entry.ticker = d.ticker
      if (typeof d.symbol === 'string') entry.ticker = d.symbol
      if (typeof d.price === 'number') entry.price = d.price
      if (typeof d.signal === 'string') entry.signal = d.signal
    }
    return entry
  })
  return JSON.stringify(items)
}

function buildUserBlock(input: AgenticPlanInput, digest: string | null): string {
  const history = formatHistoryForPrompt(input.chatHistory ?? [])
  const parts: string[] = []
  if (history) parts.push(history)
  parts.push(formatProfileBlock(input.profile))
  parts.push(`AVAILABLE READ-ONLY TOOLS:\n${catalogueForPrompt()}`)
  if (digest) {
    parts.push(
      `RESULTS SO FAR (compact digest of the tools already run this turn — do NOT re-request the same calls):\n${digest}`
    )
  }
  parts.push(`CURRENT USER MESSAGE:\n${input.message}`)
  return parts.join('\n\n')
}

/**
 * Run the bounded agentic planning loop. Returns the gathered
 * {call, result} pairs (same shape the deterministic path produces), so the
 * caller can hand them straight to the renderer.
 */
export async function runAgenticPlan(
  input: AgenticPlanInput,
  deps: AgenticPlanDeps,
  trace: TraceEvent[]
): Promise<Array<{ call: ToolCall; result: ToolResult }>> {
  const plannerCall = deps.model.plannerCall
  const results: Array<{ call: ToolCall; result: ToolResult }> = []
  const executed = new Set<string>()

  if (typeof plannerCall === 'function') {
    for (let hop = 1; hop <= MAX_HOPS; hop++) {
      const digest = hop === 1 ? null : compactDigest(results)
      const tHop = Date.now()
      let plan: AgenticHopPlan
      try {
        const raw = await plannerCall(AGENTIC_PLANNER_SYSTEM, buildUserBlock(input, digest))
        plan = parseAgenticPlan(raw)
      } catch (err: any) {
        plan = { thought: `planner_error: ${err?.message ?? 'unknown'}`, tool_calls: [], done: false }
      }

      const calls = validateCalls(plan.tool_calls)
      trace.push({
        stage: 'agentic_plan',
        payload: {
          hop,
          thought: plan.thought,
          tools: calls.map((c) => c.tool),
          done: plan.done,
        },
        latency_ms: Date.now() - tHop,
      })
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `🧠 agentic hop ${hop} → tools=[${calls.map((c) => c.tool).join(',')}] done=${plan.done}`
        )
      }

      const fresh = calls.filter((c) => !executed.has(callKey(c)))
      if (fresh.length === 0) break
      for (const c of fresh) executed.add(callKey(c))

      const hopResults = await Promise.all(
        fresh.map(async (c) => {
          const call = injectUserId(c, input.userId)
          const tTool = Date.now()
          const result = await executeTool(call, deps.supabase, deps.now)
          trace.push({
            stage: 'tool',
            payload: { tool: call.tool, ok: result.ok, source: result.source, error: result.error ?? null },
            latency_ms: Date.now() - tTool,
          })
          return { call, result }
        })
      )
      results.push(...hopResults)
      if (plan.done) break
    }
  }

  // Deterministic safety net (§6.8) — the planner produced nothing usable.
  if (results.length === 0) {
    const readCalls = planToolCalls({
      router: input.router,
      profile: input.profile,
      userId: input.userId,
      message: input.message,
    })
    trace.push({
      stage: 'agentic_plan',
      payload: { fallback: 'deterministic', tools: readCalls.map((c) => c.tool) },
    })
    const fallbackResults = await Promise.all(
      readCalls.map(async (call) => {
        const tTool = Date.now()
        const result = await executeTool(call, deps.supabase, deps.now)
        trace.push({
          stage: 'tool',
          payload: { tool: call.tool, ok: result.ok, source: result.source, error: result.error ?? null },
          latency_ms: Date.now() - tTool,
        })
        return { call, result }
      })
    )
    results.push(...fallbackResults)
  }

  return results
}
