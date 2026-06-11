/**
 * Eval harness (§9) — golden multi-turn scripts.
 * =============================================================================
 * Drives the REAL router → (agentic or static) planner → renderer pipeline with
 * a STUBBED model (deterministic router/planner JSON + a writer that records the
 * assembled prompt), so we assert on TOOL SELECTION + PROMPT GROUNDING, never on
 * model prose. This is the gate that lets us flip ORCA_AGENTIC_TOOLS ON.
 *
 * The macro core is mocked so macro turns are hermetic (no xAI network call).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/social/macroFactors', () => ({
  getMacroFactors: vi.fn().mockResolvedValue({
    factors: [{ title: 'Fed holds rates', impact: 'neutral', summary: 'No change this week.' }],
    overall_sentiment: 'neutral',
    last_updated: 'June 10, 2026',
    stale: false,
  }),
  MacroUnavailableError: class MacroUnavailableError extends Error {},
}))

import { runOrchestrator } from '@/lib/orca/orchestrator/runOrchestrator'
import { READ_ONLY_TOOLS } from '@/lib/orca/orchestrator/tools/registry'
import type { ChatTurn, Intent, TraceEvent } from '@/lib/orca/orchestrator/types'
import scenarios from './conversations.json'

const now = () => new Date('2026-06-10T12:00:00Z')

/** Canned supabase: whale rows so leaderboards have real data to ground on. */
function stubSupabase() {
  const tables: Record<string, any[]> = {
    all_whale_transactions: [
      { token_symbol: 'BTC', usd_value: 5_000_000, classification: 'buy', whale_address: '0xw1', timestamp: '2026-06-10T11:00:00Z' },
      { token_symbol: 'BTC', usd_value: 2_000_000, classification: 'sell', whale_address: '0xw2', timestamp: '2026-06-10T11:00:00Z' },
      { token_symbol: 'WETH', usd_value: 4_000_000, classification: 'sell', whale_address: '0xw3', timestamp: '2026-06-10T11:00:00Z' },
      { token_symbol: 'WETH', usd_value: 500_000, classification: 'buy', whale_address: '0xw4', timestamp: '2026-06-10T11:00:00Z' },
    ],
  }
  function from(table: string) {
    const chain: any = {
      select() { return chain },
      eq() { return chain },
      gte() { return chain },
      ilike() { return chain },
      or() { return chain },
      in() { return chain },
      order() { return chain },
      limit() { return chain },
      maybeSingle() { return Promise.resolve({ data: (tables[table] ?? [])[0] ?? null }) },
      single() { return Promise.resolve({ data: (tables[table] ?? [])[0] ?? null }) },
      then(resolve: any) { resolve({ data: tables[table] ?? [] }) },
    }
    return chain
  }
  return { from }
}

interface EvalTurn {
  user: string
  router: { intent: string; tickers?: string[]; datapoints?: string[]; entities?: string[] }
  planner?: Array<Record<string, unknown> | string>
  expect?: {
    intent?: string
    compliance?: boolean
    toolsInclude?: string[]
    toolsExclude?: string[]
    promptIncludes?: string[]
    noGreeting?: boolean
    writerCalled?: boolean
    maxHops?: number
    readOnly?: boolean
  }
}
interface EvalScenario {
  name: string
  agentic: boolean
  turns: EvalTurn[]
}

describe('ORCA eval harness (§9)', () => {
  const original = process.env.ORCA_AGENTIC_TOOLS
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => {
    if (original === undefined) delete process.env.ORCA_AGENTIC_TOOLS
    else process.env.ORCA_AGENTIC_TOOLS = original
  })

  for (const scenario of scenarios as EvalScenario[]) {
    it(scenario.name, async () => {
      process.env.ORCA_AGENTIC_TOOLS = scenario.agentic ? 'true' : 'false'

      const chatHistory: ChatTurn[] = []
      let priorIntent: Intent | undefined
      let priorTickers: string[] | undefined

      for (const turn of scenario.turns) {
        let lastPrompt = ''
        let writerCalled = false
        const plannerScript = turn.planner ?? []
        let hopIdx = 0

        const model: any = {
          routerCall: async () =>
            JSON.stringify({
              entities: [],
              persona_hint: null,
              confidence: 0.9,
              tickers: [],
              datapoints: [],
              ...turn.router,
            }),
          writerCall: async (sys: string) => {
            lastPrompt = sys
            writerCalled = true
            return 'Across the top names, BTC showed `502` buys vs `236` sells.'
          },
        }
        if (scenario.agentic) {
          model.plannerCall = async () => {
            const step = plannerScript[Math.min(hopIdx, plannerScript.length - 1)]
            hopIdx++
            return typeof step === 'string' ? step : JSON.stringify(step ?? {})
          }
        }

        const out = await runOrchestrator(
          { message: turn.user, userId: 'u1', chatHistory: [...chatHistory], profile: null, priorIntent, priorTickers },
          { supabase: stubSupabase(), model, now }
        )

        const toolStages = out.trace
          .filter((e: TraceEvent) => e.stage === 'tool')
          .map((e: TraceEvent) => String((e.payload as any)?.tool ?? ''))
        const planHops = out.trace.filter(
          (e: TraceEvent) => e.stage === 'agentic_plan' && (e.payload as any)?.hop !== undefined
        )

        const exp = turn.expect ?? {}
        if (exp.intent) expect(out.intent).toBe(exp.intent)
        if (exp.compliance) {
          expect(out.intent).toBe('compliance_decline')
          expect(writerCalled).toBe(false)
        }
        for (const t of exp.toolsInclude ?? []) expect(toolStages).toContain(t)
        for (const t of exp.toolsExclude ?? []) expect(toolStages).not.toContain(t)
        for (const s of exp.promptIncludes ?? []) expect(lastPrompt).toContain(s)
        if (exp.noGreeting) {
          expect(writerCalled).toBe(true)
          expect(lastPrompt).not.toContain('guide them to ask about a crypto asset')
        }
        if (exp.writerCalled) expect(writerCalled).toBe(true)
        if (scenario.agentic && exp.maxHops !== undefined) {
          expect(planHops.length).toBeLessThanOrEqual(exp.maxHops)
        }
        if (scenario.agentic && exp.readOnly) {
          for (const t of toolStages) {
            if (t) expect(READ_ONLY_TOOLS.has(t as any)).toBe(true)
          }
        }

        // Thread the conversation forward exactly as the route handler does.
        chatHistory.push({ role: 'user', content: turn.user })
        chatHistory.push({ role: 'assistant', content: out.text })
        priorIntent = turn.router.intent as Intent
        priorTickers = turn.router.tickers ?? []
      }
    })
  }
})
