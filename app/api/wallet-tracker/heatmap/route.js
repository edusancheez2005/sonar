import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { computeTokenFlows, flowTone, chainsLiveLabel, NET_FLOW_DEFINITION } from '@/lib/whale/netFlow'

export const dynamic = 'force-dynamic'

// Token heatmap: the same whale net-flow snapshot as the dashboard summary and
// ORCA (lib/whale/netFlow.ts; app_cache token_flows_24h / token_flows_7d).
// Before 2026-10-25 it read an arbitrary 1,000-row slice (about 7.6 h of a
// "24H" view) and called a token "bullish" when buys beat sells by 1.2×.
export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const { searchParams } = new URL(req.url)
  const hours = parseInt(searchParams.get('hours') || '', 10)
  const window = searchParams.get('window') === '7d' || (Number.isFinite(hours) && hours > 24) ? '7d' : '24h'
  try {
    const snap = await computeTokenFlows(supabaseAdmin, { window })
    const data = snap.tokens
      .slice()
      .sort((a, b) => b.volumeUsd - a.volumeUsd)
      .slice(0, 30)
      .map((t) => ({
        token_symbol: t.symbol,
        buy_volume: t.buyUsd,
        sell_volume: t.sellUsd,
        total_volume: t.volumeUsd,
        buy_count: t.buyCount,
        sell_count: t.sellCount,
        unique_wallets: t.uniqueWhales,
        net_flow: t.netUsd,
        tone: flowTone(t.netUsd, t.volumeUsd),
      }))
    return NextResponse.json({
      data,
      window,
      hours: window === '7d' ? 168 : 24,
      generated_at: snap.generated_at,
      definition: NET_FLOW_DEFINITION,
      chains_live: snap.chains_live,
      chains_label: chainsLiveLabel(snap.chains_live),
      rows_counted: snap.rows_counted,
    }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
