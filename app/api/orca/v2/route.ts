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
 * NOTE: this slice deliberately does NOT require Supabase Bearer auth (per the
 * ORCA_MULTI_AGENT_BUILD_PROMPT verification curl). Before any UI rollout,
 * gate behind ORCA_V2_ENABLED + add the same auth model as /api/chat.
 */
import { extractTicker } from '@/lib/orca/ticker-extractor'
import { checkRateLimit } from '@/lib/orca/rate-limiter'
import { runOrcaPipeline } from '@/lib/orca/agents/orchestrator'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import type { SSEEvent, PipelineTelemetry } from '@/lib/orca/agents/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, userId } = body || {}
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!userId || typeof userId !== 'string') {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Ticker parse — mirror /api/chat behaviour for the no-ticker case
  const tickerResult = extractTicker(message)
  if (!tickerResult.ticker) {
    return new Response(
      JSON.stringify({
        type: 'conversational',
        response:
          "I can only analyse a specific cryptocurrency. Try asking about a ticker like BTC, ETH, SOL, LINK, or any other token.",
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const ticker = tickerResult.ticker

  // Rate limit (best-effort; if Supabase env missing in some preview, skip)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE
  if (supabaseUrl && supabaseKey) {
    try {
      const quota = await checkRateLimit(userId, supabaseUrl, supabaseKey)
      if (!quota.canAsk) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', isRateLimited: true, quota }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (e) {
      console.warn('[orca-v2] rate limit check failed (continuing):', (e as Error).message)
    }
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
