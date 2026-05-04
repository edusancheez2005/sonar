/**
 * ORCA v2 multi-agent — shared types & Zod schemas
 * See ORCA_MULTI_AGENT_PLAN.md §2.3 and the build prompt §"Data contracts".
 */
import { z } from 'zod'

// ─── Brief schemas ──────────────────────────────────────────────────────────

export const NewsBriefSchema = z.object({
  headlines: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    source: z.string(),
    published_at: z.string(),
    sentiment: z.enum(['bullish', 'neutral', 'bearish']),
  })).max(8),
  narrative: z.string().max(600),
  themes: z.array(z.string()).max(5),
  balance_check: z.object({
    bullish: z.number().int().nonnegative(),
    neutral: z.number().int().nonnegative(),
    bearish: z.number().int().nonnegative(),
  }),
})
export type NewsBrief = z.infer<typeof NewsBriefSchema>

export const QuantBriefSchema = z.object({
  price: z.object({
    usd: z.number(),
    change_24h_pct: z.number().nullable(),
    change_7d_pct: z.number().nullable(),
  }),
  structure: z.object({
    trend: z.enum(['up', 'down', 'range', 'unknown']),
    volatility_regime: z.enum(['low', 'elevated', 'high', 'unknown']),
  }),
  derivatives: z.object({
    funding_8h_pct: z.number().nullable(),
    oi_change_24h_pct: z.number().nullable(),
  }),
  tech_signals: z.array(z.string()).max(6),
  anomalies: z.array(z.string()).max(4),
})
export type QuantBrief = z.infer<typeof QuantBriefSchema>

export const WhaleBriefSchema = z.object({
  net_flow_usd_24h: z.number().nullable(),
  direction: z.enum(['accumulation', 'distribution', 'mixed', 'no_data']),
  top_movements: z.array(z.object({
    side: z.enum(['in', 'out']),
    entity: z.string(),
    amount_usd: z.number(),
    time: z.string(),
  })).max(5),
  exchange_flow: z.object({
    in_usd: z.number().nullable(),
    out_usd: z.number().nullable(),
  }),
  confidence: z.enum(['high', 'medium', 'low', 'none']),
  data_source: z.enum(['whale_alerts', 'whale_transactions', 'both', 'none']),
})
export type WhaleBrief = z.infer<typeof WhaleBriefSchema>

// ─── Agent run record ───────────────────────────────────────────────────────

export interface AgentRun<T> {
  agent: string
  ok: boolean
  brief: T | null
  latency_ms: number
  tokens_in: number
  tokens_out: number
  error?: string
  from_cache: boolean
}

// ─── Agent contract ─────────────────────────────────────────────────────────

export interface AgentDeps {
  /** Pre-fetched ORCA context (output of buildOrcaContext). */
  context: any
  /** Ticker symbol, uppercase. */
  ticker: string
}

export interface OrcaAgent<I, O> {
  name: string
  outputSchema: z.ZodType<O>
  /** Cheap upper bound used for budget logging. */
  estimatedTokens: number
  estimatedLatencyMs: number
  run(input: I): Promise<{ brief: O; tokens_in: number; tokens_out: number }>
}

// ─── SSE event payloads (for type-safety on the producer side) ──────────────

export type SSEEvent =
  | { type: 'status'; step: string; message?: string; detail?: string; latency_ms?: number; ok?: boolean }
  | { type: 'token'; delta: string }
  | { type: 'done'; telemetry: PipelineTelemetry }
  | { type: 'error'; error: string }

export interface PipelineTelemetry {
  ticker: string
  total_latency_ms: number
  total_tokens_in: number
  total_tokens_out: number
  synth_chars: number
  agents: Array<Pick<AgentRun<unknown>, 'agent' | 'ok' | 'latency_ms' | 'tokens_in' | 'tokens_out' | 'error' | 'from_cache'>>
}
