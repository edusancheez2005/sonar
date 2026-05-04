/**
 * ORCA v2 endpoint — multi-agent pipeline.
 *
 * Request:  POST /api/orca/v2  { message: string, userId: string, conversationHistory?: any }
 * Response: SSE stream of:
 *   { type: 'status', step, message?, detail?, latency_ms?, ok? }
 *   { type: 'token', delta }
 *   { type: 'done', telemetry }
 *   { type: 'error', error }
 *
 * Auth: requires Supabase Bearer token in `Authorization` header. The verified
 * user.id is used as the canonical userId (any `userId` in the body is ignored).
 * For local smoke testing without auth, set ORCA_V2_DEV_BYPASS=1 in .env.local
 * (NEVER set in production — guarded by NODE_ENV check below).
 */
import { createClient } from '@supabase/supabase-js'
import { extractTicker } from '@/lib/orca/ticker-extractor'
import { checkRateLimit } from '@/lib/orca/rate-limiter'
import { runOrcaPipeline } from '@/lib/orca/agents/orchestrator'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import type { SSEEvent, PipelineTelemetry } from '@/lib/orca/agents/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid JSON body' })
  }

  const { message } = body || {}
  if (!message || typeof message !== 'string') {
    return json(400, { error: 'message is required' })
  }

  // ── Auth: verify Supabase Bearer token ──────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE
  if (!supabaseUrl || !supabaseKey) {
    return json(500, { error: 'server misconfigured: supabase env missing' })
  }

  let userId: string
  const devBypass =
    process.env.ORCA_V2_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production'

  if (devBypass) {
    userId = (body?.userId as string) || 'dev-bypass-user'
  } else {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
      return json(401, { error: 'Unauthorized — missing Bearer token' })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const sb = createClient(supabaseUrl, supabaseKey)
    const authPromise = sb.auth.getUser(token)
    const timeoutPromise = new Promise<{ data: { user: null }; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('auth timeout')), 10_000)
    )
    let authResult
    try {
      authResult = await Promise.race([authPromise, timeoutPromise])
    } catch {
      return json(500, { error: 'auth verification timeout' })
    }
    const { data, error } = authResult
    if (error || !data?.user) {
      return json(401, { error: 'Unauthorized — invalid token' })
    }
    userId = data.user.id
  }

  // Ticker parse — mirror /api/chat behaviour for the no-ticker case
  const tickerResult = extractTicker(message)
  if (!tickerResult.ticker) {
    return json(200, {
      type: 'conversational',
      response:
        "I can only analyse a specific cryptocurrency. Try asking about a ticker like BTC, ETH, SOL, LINK, or any other token.",
    })
  }
  const ticker = tickerResult.ticker

  // Rate limit (best-effort — log and continue if check itself errors)
  try {
    const quota = await checkRateLimit(userId, supabaseUrl, supabaseKey)
    if (!quota.canAsk) {
      return json(429, { error: 'Rate limit exceeded', isRateLimited: true, quota })
    }
  } catch (e) {
    console.warn('[orca-v2] rate limit check failed (continuing):', (e as Error).message)
  }

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // controller already closed
        }
      }

      let telemetry: PipelineTelemetry | null = null
      let synthOk = false
      try {
        const result = await runOrcaPipeline({ ticker, userId, message, send })
        telemetry = result.telemetry
        synthOk = result.synthOk
        if (synthOk) {
          send({ type: 'done', telemetry })
        } else {
          send({ type: 'error', error: 'Synthesiser failed to produce a response.' })
        }
      } catch (err: any) {
        console.error('[orca-v2] pipeline error:', err)
        send({ type: 'error', error: err?.message || 'pipeline error' })
      } finally {
        controller.close()

        // Best-effort telemetry insert. Never block, never throw out.
        if (telemetry) {
          try {
            await supabaseAdmin.from('orca_runs').insert({
              ticker: telemetry.ticker,
              user_id: userId,
              message,
              agents: telemetry.agents as any,
              total_latency_ms: telemetry.total_latency_ms,
              total_tokens_in: telemetry.total_tokens_in,
              total_tokens_out: telemetry.total_tokens_out,
              synth_chars: telemetry.synth_chars,
              ok: synthOk,
              error: synthOk ? null : 'synth_failed',
            })
          } catch (e) {
            console.warn('[orca-v2] orca_runs insert failed:', (e as Error).message)
          }
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/orca/v2',
      message: 'ORCA v2 multi-agent endpoint — POST { message, userId } to use',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
