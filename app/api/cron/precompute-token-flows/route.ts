/**
 * Cron: precompute-token-flows
 * =============================================================================
 * Writes the shared whale net-flow snapshot (lib/whale/netFlow.ts) to app_cache:
 *   token_flows_24h — every 5 minutes (vercel.json)
 *   token_flows_7d  — hourly (?window=7d)
 * The dashboard summary, the heatmap and ORCA read these rows, so every surface
 * shows the same numbers. Pure database reads: no AI calls, no spend.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { computeTokenFlows, TOKEN_FLOWS_CACHE_KEYS, type FlowWindow } from '@/lib/whale/netFlow'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 120

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const w = new URL(req.url).searchParams.get('window')
  const window: FlowWindow = w === '7d' ? '7d' : '24h'
  const t0 = Date.now()
  try {
    const snap = await computeTokenFlows(supabaseAdmin as any, { window, fresh: true })
    const { error } = await supabaseAdmin
      .from('app_cache')
      .upsert({ key: TOKEN_FLOWS_CACHE_KEYS[window], value: snap, updated_at: snap.generated_at }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    return NextResponse.json({
      ok: true,
      window,
      generated_at: snap.generated_at,
      rows_read: snap.rows_read,
      rows_counted: snap.rows_counted,
      complete: snap.complete,
      tokens: snap.tokens.length,
      chains_live: snap.chains_live,
      excluded: snap.excluded,
      ms: Date.now() - t0,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, window, error: String(e?.message || e).slice(0, 200), ms: Date.now() - t0 }, { status: 500 })
  }
}
