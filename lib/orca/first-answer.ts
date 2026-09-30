/**
 * Precomputed first answer (2026-09-30).
 * =============================================================================
 * Every new account is greeted by ORCA answering FIRST_QUESTION ("In plain
 * English, what have crypto whales been doing in the last 24 hours?"). Even
 * with the deterministic fast path the writer model needs 7-10s before its
 * first token, so a cron recomputes this one answer every 15 minutes and the
 * chat route serves it from app_cache when the question matches — the first
 * screen streams in ~1s instead of ~10s. The cached text is a real ORCA
 * answer (same tool, renderer and guardrails); it carries its own
 * "as of HH:MM UTC" line and is never served older than MAX_AGE.
 */
import type OpenAI from 'openai'
import { runOrchestrator } from './orchestrator/runOrchestrator'
import type { OrchestratorOutput, SupabaseLike } from './orchestrator/types'
import { matchFastPath, type FastPath } from './fast-paths'
import { FIRST_QUESTION } from '../onboarding/firstRun'

export const FIRST_ANSWER_CACHE_KEY = 'orca_first_answer_24h'
export const FIRST_ANSWER_MAX_AGE_MS = 20 * 60 * 1000
/** Synthetic user for the precompute run (no user tools are involved). */
const SERVICE_USER_ID = '00000000-0000-0000-0000-000000000000'

export interface CachedFirstAnswer {
  text: string
  tools: string[]
  generated_at: string
  chars: number
  writer_ms: number
}

/** The cached answer applies to any market-wide 24h whale-activity question. */
export function isFirstAnswerQuestion(fp: FastPath | null | undefined): boolean {
  if (!fp || fp.name !== 'whale_summary') return false
  const args = (fp.calls[0]?.args ?? {}) as { window?: unknown }
  return args.window === '24h'
}

export async function readCachedFirstAnswer(supabase: any): Promise<CachedFirstAnswer | null> {
  try {
    const { data } = await supabase
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', FIRST_ANSWER_CACHE_KEY)
      .maybeSingle()
    const v = data?.value as CachedFirstAnswer | undefined
    if (!v?.text || typeof v.text !== 'string') return null
    const age = Date.now() - Date.parse(v.generated_at || data?.updated_at || 0)
    if (!Number.isFinite(age) || age > FIRST_ANSWER_MAX_AGE_MS) return null
    return v
  } catch {
    return null
  }
}

/** Run the real pipeline (fast path → tool → writer → guardrails) once. */
export async function computeFirstAnswer(deps: {
  supabase: SupabaseLike
  ai: OpenAI
  writerModel: string
  reasoningEffort?: string
}): Promise<CachedFirstAnswer> {
  const fp = matchFastPath(FIRST_QUESTION, false)
  if (!fp) throw new Error('FIRST_QUESTION no longer matches the whale_summary fast path')
  let writerMs = 0
  const out: OrchestratorOutput = await runOrchestrator(
    {
      message: FIRST_QUESTION,
      userId: SERVICE_USER_ID,
      chatHistory: [],
      profile: null,
      preplannedCalls: fp.calls,
    },
    {
      supabase: deps.supabase,
      model: {
        routerCall: async () => JSON.stringify(fp.decision),
        plannerCall: async () => '{}',
        writerCall: async (sys: string, usr: string) => {
          const t0 = Date.now()
          const r = await deps.ai.chat.completions.create({
            model: deps.writerModel,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: usr },
            ],
            temperature: 0.5,
            max_tokens: 900,
            ...(deps.reasoningEffort ? ({ reasoning_effort: deps.reasoningEffort } as any) : {}),
          })
          writerMs = Date.now() - t0
          return r.choices[0]?.message?.content ?? ''
        },
      },
    }
  )
  if (!out.text || out.intent === 'compliance_decline') throw new Error('precompute produced no usable text')
  return {
    text: out.text,
    tools: out.trace.filter((e) => e.stage === 'tool').map((e) => String((e.payload as any)?.tool ?? '')),
    generated_at: new Date().toISOString(),
    chars: out.text.length,
    writer_ms: writerMs,
  }
}

/** Split text into token-sized pieces so the client's streaming path behaves as usual. */
export function chunkText(text: string, size = 96): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}
