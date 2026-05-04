/**
 * Agent registry — wraps every sub-agent invocation with timeout, single retry,
 * Zod validation, structured logging and telemetry capture.
 *
 * This is the ONLY place that catches agent errors. `runAgent` never throws.
 * See ORCA_MULTI_AGENT_PLAN.md §2.4 (Phase 0).
 */
import type { z } from 'zod'
import type { AgentRun } from './types'

/*
 * Note on the 15s timeout (deviation from the original 8s spec):
 *
 * The build-prompt mandate of `AbortSignal.timeout(8000)` was found to be
 * too tight in production: smoke tests against /api/orca/v2 showed every
 * sub-agent aborting at ~8.0s when calling grok-4-fast-non-reasoning and
 * grok-3-mini with response_format=json_object on real ticker payloads.
 * The xAI inference latency for these models is consistently 8–12s for
 * the brief sizes we send (news headline list + price/whale aggregates).
 *
 * 15s preserves the spirit of the constraint (orchestrator must never
 * hang on one slow agent — Promise.allSettled still bounds total wall
 * clock, and the synthesiser still runs with whatever briefs returned)
 * while letting the cheap models actually complete their JSON output.
 */
const DEFAULT_TIMEOUT_MS = 15_000


interface RunArgs<O> {
  name: string
  schema: z.ZodType<O>
  /** Returns the LLM's raw JSON-parseable string + token usage. Receives the AbortSignal. */
  exec: (signal: AbortSignal) => Promise<{ raw: string; tokens_in: number; tokens_out: number }>
  timeoutMs?: number
}

/**
 * Run one sub-agent end-to-end. Returns AgentRun<O>; never throws.
 *
 * Retry policy: at most one retry, only on transient failures
 * (timeout, network, 5xx). Schema-validation failures are NOT retried — those
 * indicate prompt drift and a retry would just burn tokens.
 */
export async function runAgent<O>({
  name,
  schema,
  exec,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunArgs<O>): Promise<AgentRun<O>> {
  const started = Date.now()
  let lastError: string | undefined
  let tokensInTotal = 0
  let tokensOutTotal = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const { raw, tokens_in, tokens_out } = await exec(controller.signal)
      tokensInTotal += tokens_in
      tokensOutTotal += tokens_out
      clearTimeout(timer)

      // Strip code fences and isolate the first JSON object.
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start < 0 || end <= start) {
        lastError = `agent ${name}: no JSON object in output`
        // Schema problem — don't retry.
        break
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1))
      } catch (e: any) {
        lastError = `agent ${name}: invalid JSON (${e?.message || 'parse error'})`
        // Schema problem — don't retry.
        break
      }

      const validated = schema.safeParse(parsed)
      if (!validated.success) {
        lastError = `agent ${name}: schema validation failed (${validated.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')})`
        // Schema problem — don't retry.
        break
      }

      const latency_ms = Date.now() - started
      console.log(
        `[orca-v2] agent=${name} ok=true latency_ms=${latency_ms} tokens_in=${tokensInTotal} tokens_out=${tokensOutTotal} attempt=${attempt + 1}`
      )
      return {
        agent: name,
        ok: true,
        brief: validated.data,
        latency_ms,
        tokens_in: tokensInTotal,
        tokens_out: tokensOutTotal,
        from_cache: false,
      }
    } catch (e: any) {
      clearTimeout(timer)
      const msg = String(e?.message || '')
      const isAbort =
        e?.name === 'AbortError' ||
        e?.name === 'APIUserAbortError' ||
        /aborted|timeout/i.test(msg)
      lastError = isAbort
        ? `agent ${name}: timeout after ${timeoutMs}ms`
        : `agent ${name}: ${msg || 'unknown error'}`
      // Retry ONLY transient network/5xx failures. Timeout retries never help
      // (xAI inference latency is the bottleneck — a retry will time out the
      // same way) and they double the wall-clock budget.
      if (attempt === 0 && !isAbort && /5\d\d|network|fetch failed|ECONNRESET/i.test(msg)) {
        continue
      }
      break
    }
  }

  const latency_ms = Date.now() - started
  console.log(
    `[orca-v2] agent=${name} ok=false latency_ms=${latency_ms} tokens_in=${tokensInTotal} tokens_out=${tokensOutTotal} error=${lastError}`
  )
  return {
    agent: name,
    ok: false,
    brief: null,
    latency_ms,
    tokens_in: tokensInTotal,
    tokens_out: tokensOutTotal,
    error: lastError,
    from_cache: false,
  }
}
