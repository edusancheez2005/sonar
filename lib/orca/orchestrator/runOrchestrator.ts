/**
 * runOrchestrator
 * =============================================================================
 * Top-level entry point for the v2 chat pipeline (§4.C). Sequences:
 *   router → planner → tools (in parallel) → renderer → writer → guardrails
 * and returns the user-facing text plus a list of trace events the caller
 * is expected to persist to `orca_traces`.
 *
 * Dependencies are injected so the whole pipeline is unit-testable without
 * touching Supabase or the model SDK.
 */
import { COMPLIANCE_DECLINE_RESPONSE, applyGuardrails } from './guardrails'
import { planToolCalls } from './planner'
import { routeMessage } from './router'
import { selectRenderer } from '../renderers'
import { executeTool } from './tools/registry'
import type {
  ChatTurn,
  ModelClient,
  OrchestratorOutput,
  SupabaseLike,
  ToolCall,
  ToolResult,
  TraceEvent,
  UserProfileSnapshot,
} from './types'

export interface RunOrchestratorInput {
  message: string
  userId: string
  chatHistory: ChatTurn[]
  profile: UserProfileSnapshot | null
  userConfirmed?: boolean
  /**
   * Confirmed write calls the route handler wants the planner to schedule.
   * Only honoured when `userConfirmed === true`. Each entry is a write-tool
   * call shape (`{tool, args}`); reads from this list are ignored.
   */
  confirmedWriteCalls?: ToolCall[]
  /**
   * Prior-turn subject carry-over (Fix #2). Lets a `followup` intent inherit
   * the right tools from the previous assistant turn's intent/tickers.
   */
  priorIntent?: import('./types').Intent
  priorTickers?: string[]
}

export interface RunOrchestratorDeps {
  supabase: SupabaseLike
  model: ModelClient
  now?: () => Date
}

const WRITE_TOOLS = new Set(['addToWatchlist', 'removeFromWatchlist', 'setUserAlert'])

export async function runOrchestrator(
  input: RunOrchestratorInput,
  deps: RunOrchestratorDeps
): Promise<OrchestratorOutput> {
  const now = deps.now ?? (() => new Date())
  const trace: TraceEvent[] = []

  // --- Stage 1: route -------------------------------------------------------
  const tRouter = Date.now()
  const router = await routeMessage(
    { message: input.message, userId: input.userId, chatHistory: input.chatHistory },
    deps.model
  )
  trace.push({
    stage: 'router',
    payload: { intent: router.intent, confidence: router.confidence, tickers: router.tickers, datapoints: router.datapoints },
    latency_ms: Date.now() - tRouter,
  })

  // Short-circuit compliance_decline before any tool calls.
  if (router.intent === 'compliance_decline') {
    trace.push({ stage: 'guardrails', payload: { declined: true, reason: 'compliance_decline' } })
    return {
      text: COMPLIANCE_DECLINE_RESPONSE,
      intent: router.intent,
      trace,
    }
  }

  // --- Stage 2: plan --------------------------------------------------------
  const readCalls = planToolCalls({
    router,
    profile: input.profile,
    userId: input.userId,
    message: input.message,
    userConfirmed: input.userConfirmed,
    priorIntent: input.priorIntent,
    priorTickers: input.priorTickers,
  })
  const writeCalls = input.userConfirmed
    ? (input.confirmedWriteCalls ?? []).filter((c) => WRITE_TOOLS.has(c.tool))
    : []
  const allCalls: ToolCall[] = [...readCalls, ...writeCalls]
  trace.push({
    stage: 'planner',
    payload: { read_calls: readCalls.length, write_calls: writeCalls.length, tools: allCalls.map((c) => c.tool) },
  })

  // --- Stage 3: execute tools in parallel ----------------------------------
  const toolResults: Array<{ call: ToolCall; result: ToolResult }> = await Promise.all(
    allCalls.map(async (call) => {
      const tTool = Date.now()
      const result = await executeTool(call, deps.supabase, now)
      trace.push({
        stage: 'tool',
        payload: { tool: call.tool, ok: result.ok, source: result.source, args: redactArgs(call.args), error: result.error ?? null },
        latency_ms: Date.now() - tTool,
      })
      return { call, result }
    })
  )

  // Collect the full wallet addresses surfaced this turn (most-prominent
  // first) so the caller can persist them for next-turn pronoun resolution
  // ("track this wallet"). Chat text only ever shows the shortened form.
  const walletAddresses = collectWalletAddresses(toolResults)

  // --- Stage 4: writer ------------------------------------------------------
  const renderer = selectRenderer(router.intent)
  const systemPrompt = renderer({ toolResults, profile: input.profile, message: input.message, chatHistory: input.chatHistory })

  const tWriter = Date.now()
  let draft: string
  try {
    draft = await deps.model.writerCall(systemPrompt, input.message)
  } catch (err: any) {
    trace.push({
      stage: 'writer',
      payload: { error: err?.message ?? 'writer_failed' },
      latency_ms: Date.now() - tWriter,
    })
    return {
      text:
        "I could not generate a response just now. Please try again in a moment.\n\n" +
        'Not financial advice. This is research-grade analysis only.',
      intent: router.intent,
      trace,
    }
  }
  trace.push({
    stage: 'writer',
    payload: { chars: draft.length },
    latency_ms: Date.now() - tWriter,
  })

  // --- Stage 5: guardrails --------------------------------------------------
  const guarded = applyGuardrails(draft)
  trace.push({
    stage: 'guardrails',
    payload: { violations: guarded.violations, declined: guarded.declined },
  })

  return {
    text: guarded.text,
    intent: router.intent,
    trace,
    walletAddresses,
  }
}

/**
 * Walk wallet-bearing tool results and collect the full (un-shortened)
 * addresses they surfaced, in display order, de-duplicated. Covers the
 * three wallet read tools: getMostActiveWallets (data.wallets[]),
 * findTrackedWallets (data.matches[]), and getWalletActivity (the queried
 * call.args.address). Returns [] when no wallet tool ran.
 */
function collectWalletAddresses(
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (addr: unknown) => {
    if (typeof addr !== 'string') return
    const a = addr.trim()
    if (!a || seen.has(a.toLowerCase())) return
    seen.add(a.toLowerCase())
    out.push(a)
  }
  for (const { call, result } of toolResults) {
    if (!result?.ok || !result.data) continue
    const d = result.data as any
    if (Array.isArray(d.wallets)) for (const w of d.wallets) push(w?.address)
    if (Array.isArray(d.matches)) for (const m of d.matches) push(m?.address)
    if (typeof call?.args?.address === 'string') push(call.args.address)
  }
  return out.slice(0, 10)
}

/**
 * Strip any field name that looks user-identifying from tool args before
 * we persist them in a trace row. The userId column on orca_traces already
 * captures the actor; the args jsonb should not duplicate it.
 */
function redactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (k === 'userId' || k === 'user_id') {
      out[k] = '[redacted]'
    } else {
      out[k] = v
    }
  }
  return out
}
