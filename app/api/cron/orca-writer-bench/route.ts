/**
 * Diagnostic: time ORCA's short-answer writer on a given model (CRON_SECRET).
 * =============================================================================
 * The xAI key only exists in Vercel, so model latency cannot be measured from
 * a laptop. This runs the REAL synthesis prompt (getTrendingWhales 24h +
 * renderSynthesisPrompt) against `?model=` and reports time-to-first-token and
 * total time. Read-only, no persistence, no user data.
 *   GET /api/cron/orca-writer-bench?model=grok-4.3&effort=low
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { executeTool } from '@/lib/orca/orchestrator/tools/registry'
import { renderSynthesisPrompt } from '@/lib/orca/renderers/synthesis'
import { FIRST_QUESTION } from '@/lib/onboarding/firstRun'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) return NextResponse.json({ ok: false, error: 'XAI_API_KEY missing' }, { status: 500 })
  const url = new URL(req.url)
  const model = (url.searchParams.get('model') || process.env.ORCA_GROK_MINI_MODEL || 'grok-4.3').slice(0, 60)
  const effort = url.searchParams.get('effort') || ''
  const maxTokens = Math.min(2000, Number(url.searchParams.get('max_tokens')) || 900)

  const t0 = Date.now()
  try {
    const call = { tool: 'getTrendingWhales' as const, args: { window: '24h' } }
    const result = await executeTool(call, supabaseAdmin as any)
    const tTool = Date.now() - t0
    const sys = renderSynthesisPrompt(
      { toolResults: [{ call, result }], profile: null, message: FIRST_QUESTION, chatHistory: [] },
      'data_query'
    )
    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
    const tW = Date.now()
    const stream: any = await (ai.chat.completions.create as any)(
      {
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: FIRST_QUESTION },
        ],
        temperature: 0.5,
        max_tokens: maxTokens,
        stream: true,
        ...(effort ? { reasoning_effort: effort } : {}),
      },
      { signal: AbortSignal.timeout(50_000) }
    )
    let text = ''
    let firstTokenMs: number | null = null
    for await (const chunk of stream) {
      const delta = chunk?.choices?.[0]?.delta?.content
      if (delta) {
        if (firstTokenMs === null) firstTokenMs = Date.now() - tW
        text += delta
      }
    }
    return NextResponse.json({
      ok: true,
      model,
      effort: effort || null,
      tool_ms: tTool,
      prompt_chars: sys.length,
      first_token_ms: firstTokenMs,
      writer_total_ms: Date.now() - tW,
      chars: text.length,
      head: text.slice(0, 200),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, model, effort: effort || null, error: String(e?.message || e).slice(0, 300), total_ms: Date.now() - t0 }, { status: 500 })
  }
}
