/**
 * Cron: precompute-orca-first-answer (every 15 min)
 * =============================================================================
 * Recomputes the answer to FIRST_QUESTION through the real ORCA pipeline and
 * stores it in app_cache (lib/orca/first-answer.ts). The chat route serves it
 * to any market-wide 24h whale question while it is < 20 min old, so a new
 * account's first screen streams in ~1s instead of waiting ~10s on the writer.
 */
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { computeFirstAnswer, FIRST_ANSWER_CACHE_KEY } from '@/lib/orca/first-answer'

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

  const t0 = Date.now()
  try {
    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
    const writerModel = process.env.ORCA_SHORT_WRITER_MODEL || process.env.ORCA_GROK_MINI_MODEL || 'grok-4.3'
    const reasoningEffort = /grok-4\.[5-9]/.test(writerModel) ? (process.env.ORCA_SHORT_WRITER_EFFORT || 'low') : undefined
    const answer = await computeFirstAnswer({ supabase: supabaseAdmin as any, ai, writerModel, reasoningEffort })
    const { error } = await supabaseAdmin
      .from('app_cache')
      .upsert({ key: FIRST_ANSWER_CACHE_KEY, value: answer, updated_at: answer.generated_at }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, chars: answer.chars, tools: answer.tools, writer_ms: answer.writer_ms, total_ms: Date.now() - t0, model: writerModel, reasoning_effort: reasoningEffort ?? null, preview: answer.text.slice(0, 160) })
  } catch (e: any) {
    console.error('[precompute-orca-first-answer]', e?.message || e)
    return NextResponse.json({ ok: false, error: String(e?.message || e).slice(0, 200), total_ms: Date.now() - t0 }, { status: 500 })
  }
}
