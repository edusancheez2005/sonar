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
import { detectFastWrite } from './fastWrites'
import { selectRenderer } from '../renderers'
import { executeTool } from './tools/registry'
import type {
  ChatTurn,
  Intent,
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
}

export interface RunOrchestratorDeps {
  supabase: SupabaseLike
  model: ModelClient
  now?: () => Date
}

const WRITE_TOOLS = new Set(['addToWatchlist', 'removeFromWatchlist', 'setUserAlert'])

/**
 * Per-tool execution budget. v4 §5.2: nothing the orchestrator awaits is
 * allowed to block longer than this. The chat route maxDuration is 60s; we
 * leave generous headroom for the writer LLM call.
 */
const TOOL_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`tool_timeout:${label}:${ms}ms`))
    }, ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

export async function runOrchestrator(
  input: RunOrchestratorInput,
  deps: RunOrchestratorDeps
): Promise<OrchestratorOutput> {
  const now = deps.now ?? (() => new Date())
  const trace: TraceEvent[] = []

  // --- Stage 0: deterministic write fast-path (v4 §5.1) ---------------------
  // If the user explicitly typed "add BTC to watchlist", we skip the LLM
  // router entirely, emit short prose plus a confirm payload, and let the
  // client surface Confirm/Cancel. The actual write runs on the NEXT turn
  // when the client echoes `confirm.calls` back to us. This keeps the
  // first turn at sub-250ms and avoids the writer-prose-then-confirm loop
  // that previously hid the action from the user entirely.
  //
  // We bypass this path when `userConfirmed === true` so the second turn
  // (the actual write) is allowed to proceed through the planner.
  if (!input.userConfirmed) {
    const fast = detectFastWrite(input.message)
    if (fast) {
      trace.push({
        stage: 'router',
        payload: { intent: 'personal', fast_write: true, label: fast.confirm.label },
        latency_ms: 0,
      })
      return {
        text: fast.prose,
        intent: 'personal' as Intent,
        trace,
        confirm: fast.confirm,
      }
    }
  }

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
    userConfirmed: input.userConfirmed,
  })
  const writeCalls = input.userConfirmed
    ? (input.confirmedWriteCalls ?? [])
        .filter((c) => WRITE_TOOLS.has(c.tool))
        // Inject the verified userId server-side. Clients echo {tool,args}
        // from a previous orchestrator confirm payload that contains only
        // {ticker}; the write tools require userId and the planner does
        // not see this list, so we attach it here. NEVER trust client-
        // supplied userId.
        .map((c) => ({ ...c, args: { ...c.args, userId: input.userId } }))
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
      let result: ToolResult
      try {
        result = await withTimeout(
          executeTool(call, deps.supabase, now),
          TOOL_TIMEOUT_MS,
          call.tool
        )
      } catch (err: any) {
        result = {
          ok: false,
          data: null,
          source: 'timeout',
          fetched_at: now().toISOString(),
          error: err?.message ?? 'tool_failed',
        }
      }
      trace.push({
        stage: 'tool',
        payload: { tool: call.tool, ok: result.ok, source: result.source, args: redactArgs(call.args), error: result.error ?? null },
        latency_ms: Date.now() - tTool,
      })
      return { call, result }
    })
  )

  // --- Stage 4: writer ------------------------------------------------------
  const renderer = selectRenderer(router.intent)
  const systemPrompt = renderer({ toolResults, profile: input.profile, message: input.message })

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
  }
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
