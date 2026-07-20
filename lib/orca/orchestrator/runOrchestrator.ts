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
import { mentionsMacroEvent } from '../route-dispatch'
import { planToolCalls } from './planner'
import { runAgenticPlan } from './agenticPlanner'
import { routeMessage } from './router'
import { selectRenderer } from '../renderers'
import { renderSynthesisPrompt } from '../renderers/synthesis'
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

  // --- Stage 2 + 3: plan + execute tools -----------------------------------
  // §6 — when the agentic loop is enabled (ORCA_AGENTIC_TOOLS === 'true') AND a
  // plannerCall is wired into the model, let an LLM plan → observe → re-plan
  // over READ-ONLY tools (capped at 2 hops). Otherwise use the static
  // deterministic planner. The flag defaults OFF so the code ships dark; with
  // it OFF, behaviour is byte-for-byte today's. Either branch ends with
  // `toolResults: Array<{call, result}>`.
  const useAgentic =
    process.env.ORCA_AGENTIC_TOOLS === 'true' && typeof deps.model.plannerCall === 'function'

  // Confirmed write calls always flow through the existing two-trip confirm
  // path (never schedulable by the agentic loop — the catalogue is read-only).
  const writeCalls = input.userConfirmed
    ? (input.confirmedWriteCalls ?? []).filter((c) => WRITE_TOOLS.has(c.tool))
    : []

  let toolResults: Array<{ call: ToolCall; result: ToolResult }>
  if (useAgentic) {
    toolResults = await runAgenticPlan(
      {
        router,
        profile: input.profile,
        userId: input.userId,
        message: input.message,
        chatHistory: input.chatHistory,
      },
      { supabase: deps.supabase, model: deps.model, now },
      trace
    )
    if (writeCalls.length > 0) {
      const writeResults = await Promise.all(
        writeCalls.map(async (call) => {
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
      toolResults = [...toolResults, ...writeResults]
    }
  } else {
    const readCalls = planToolCalls({
      router,
      profile: input.profile,
      userId: input.userId,
      message: input.message,
      userConfirmed: input.userConfirmed,
      priorIntent: input.priorIntent,
      priorTickers: input.priorTickers,
    })
    const allCalls: ToolCall[] = [...readCalls, ...writeCalls]
    trace.push({
      stage: 'planner',
      payload: { read_calls: readCalls.length, write_calls: writeCalls.length, tools: allCalls.map((c) => c.tool) },
    })

    toolResults = await Promise.all(
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
  }

  // 2026-07-20 audit — a label search alone answers "show me Robinhood's
  // cold wallet" with a bare address table and no activity. When
  // findTrackedWallets produced matches and nothing fetched activity this
  // turn, auto-fetch it for the top match so the answer includes real
  // (or honestly-zero) flows.
  const searchHit = toolResults.find(
    (r) =>
      r.call.tool === 'findTrackedWallets' &&
      r.result.ok &&
      Array.isArray((r.result.data as any)?.matches) &&
      ((r.result.data as any).matches as any[]).length > 0
  )
  const activityAlreadyFetched = toolResults.some((r) => r.call.tool === 'getWalletActivity')
  if (searchHit && !activityAlreadyFetched) {
    const top = ((searchHit.result.data as any).matches as any[])[0]
    if (top?.address) {
      const call: ToolCall = {
        tool: 'getWalletActivity',
        args: { address: top.address, chain: top.chain, userId: input.userId },
      }
      const tTool = Date.now()
      const result = await executeTool(call, deps.supabase, now)
      trace.push({
        stage: 'tool',
        payload: { tool: call.tool, ok: result.ok, source: result.source, args: redactArgs(call.args), error: result.error ?? null, followup_for: 'findTrackedWallets' },
        latency_ms: Date.now() - tTool,
      })
      toolResults = [...toolResults, { call, result }]
    }
  }

  // Collect the full wallet addresses surfaced this turn (most-prominent
  // first) so the caller can persist them for next-turn pronoun resolution
  // ("track this wallet"). Chat text only ever shows the shortened form.
  const walletAddresses = collectWalletAddresses(toolResults)

  // --- Stage 4: writer ------------------------------------------------------
  // The agentic path uses the tool-driven synthesis renderer (it can gather
  // cross-cutting tools that don't map to one intent renderer); the
  // deterministic path uses the per-intent renderer exactly as before.
  const renderArgs = { toolResults, profile: input.profile, message: input.message, chatHistory: input.chatHistory }
  let systemPrompt = useAgentic
    ? renderSynthesisPrompt(renderArgs, router.intent)
    : selectRenderer(router.intent)(renderArgs)

  // 2026-07-20 audit — live-search fallback. When the local tools cannot
  // fulfil the question, let the writer use Grok live web/X search instead of
  // answering "that isn't available here":
  //   - an article row exists but has no stored body (news_items.content is
  //     null for most ingested rows), or the article wasn't found at all;
  //   - a macro-event question ("how did the US strikes on Iran affect BTC?")
  //     that the cached weekly factors don't necessarily cover.
  // Whale/wallet questions never qualify — that data is on-chain and local.
  const articleThin = toolResults.some((r) => {
    if (r.call.tool !== 'getArticleContext') return false
    if (!r.result.ok) return true
    const d = r.result.data as any
    return !d?.found || !d?.excerpt
  })
  const macroEventAsk =
    mentionsMacroEvent(input.message) &&
    (router.intent === 'data_query' || router.intent === 'overview' || router.intent === 'followup' || router.intent === 'explainer')
  const useLiveSearch =
    typeof deps.model.writerSearchCall === 'function' && (articleThin || macroEventAsk)
  if (useLiveSearch) {
    systemPrompt +=
      '\n\nLIVE SEARCH ENABLED FOR THIS REPLY: the local dataset could not fully answer the question. You may supplement the tool data above with current public web/X reporting. Attribute anything you pull in ("According to [source], [date]…"), never contradict the tool data with searched claims, and say plainly when even search turns up nothing. All compliance rules still apply.'
  }

  const tWriter = Date.now()
  let draft: string
  let liveSearchUsed = useLiveSearch
  try {
    if (useLiveSearch) {
      try {
        draft = await deps.model.writerSearchCall!(systemPrompt, input.message, { deep: articleThin })
      } catch (searchErr: any) {
        // Search upstream flaked — a plain tool-grounded answer beats an
        // apology. Note the downgrade in the trace.
        trace.push({
          stage: 'writer',
          payload: { live_search_error: searchErr?.message ?? 'search_writer_failed' },
          latency_ms: Date.now() - tWriter,
        })
        liveSearchUsed = false
        draft = await deps.model.writerCall(systemPrompt, input.message)
      }
    } else {
      draft = await deps.model.writerCall(systemPrompt, input.message)
    }
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
    payload: { chars: draft.length, live_search: liveSearchUsed },
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
