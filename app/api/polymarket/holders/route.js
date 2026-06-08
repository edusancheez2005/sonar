import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// PERF: select only the columns the drawer renders (drop the implicit
// select('*')). `arkham_entity` is the Arkham-resolved real name and takes
// priority over pseudonyms in the UI.
const HOLDER_COLUMNS = 'condition_id,proxy_wallet,name,arkham_entity,amount,outcome_index,updated_at'

// Drill-down endpoint for the Polymarket radar.
//   ?proxy_wallet=0x...   -> every market a given whale holds
//   ?condition_id=0x...   -> every whale in a given market (size desc)
// Exactly one filter must be supplied.
export async function GET(req) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const proxyWallet = (searchParams.get('proxy_wallet') || '').trim()
  const conditionId = (searchParams.get('condition_id') || '').trim()
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100', 10)), 200)

  if ((proxyWallet && conditionId) || (!proxyWallet && !conditionId)) {
    return NextResponse.json(
      { error: 'Provide exactly one of proxy_wallet or condition_id' },
      { status: 400 }
    )
  }

  let q = supabaseAdmin.from('polymarket_market_holders').select(HOLDER_COLUMNS)
  if (proxyWallet) {
    q = q.eq('proxy_wallet', proxyWallet).order('amount', { ascending: false, nullsFirst: false })
  } else {
    q = q.eq('condition_id', conditionId).order('amount', { ascending: false, nullsFirst: false })
  }
  q = q.limit(limit)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = data || []

  // Enrich each holding with its market's question + slug + outcomes so the
  // whale drill-down can show readable market names and link out to
  // Polymarket. Holder rows only carry condition_id.
  try {
    const cids = [...new Set(rows.map((r) => r.condition_id).filter(Boolean))]
    if (cids.length) {
      const { data: mkts } = await supabaseAdmin
        .from('polymarket_markets')
        .select('condition_id, question, slug, outcomes, outcome_prices, category, end_date')
        .in('condition_id', cids)
      const byCid = new Map((mkts || []).map((m) => [m.condition_id, m]))
      rows = rows.map((r) => {
        const m = byCid.get(r.condition_id)
        if (!m) return r
        return {
          ...r,
          question: r.question || m.question || null,
          market_slug: r.market_slug || m.slug || null,
          outcomes: r.outcomes || m.outcomes || null,
          outcome_prices: r.outcome_prices || m.outcome_prices || null,
          category: r.category || m.category || null,
          end_date: r.end_date || m.end_date || null,
        }
      })
    }
  } catch {
    // Non-fatal — return un-enriched rows.
  }

  return NextResponse.json({ data: rows, filter: proxyWallet ? 'proxy_wallet' : 'condition_id' })
}
