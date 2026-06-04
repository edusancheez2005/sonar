import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Top Polymarket markets ranked by 24h trading volume — the "what's hot
// on Polymarket" board. Whale flow + whale count travel along as signal
// columns (see PolymarketClient) but no longer drive the ordering, so the
// list stays full even where whale coverage is still sparse.
// Read-only; service-role stays server-side so no Supabase secret ever
// reaches the client.
export async function GET(req) {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '150', 10)), 600)
  const category = (searchParams.get('category') || '').trim()
  const sort = (searchParams.get('sort') || 'volume').trim()

  // Whitelisted sort columns → real DB columns. Anything else falls back
  // to 24h volume so a bad query param can't break the panel.
  const SORT_COLUMNS = {
    volume: 'volume_24h',
    whale_flow: 'whale_flow',
    competitive: 'competitive',
  }
  const sortColumn = SORT_COLUMNS[sort] || 'volume_24h'

  let query = supabaseAdmin.from('polymarket_markets').select('*')
  if (category && category !== 'all') query = query.eq('category', category)
  query = query.order(sortColumn, { ascending: false, nullsFirst: false }).limit(limit)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const markets = data || []

  // Recompute the real distinct-wallet count from the holders table as a
  // cross-check on the stored `whale_count`.
  // IMPORTANT:
  //  - PostgREST caps a single response (~1000 rows), so page with .range().
  //  - A single `.in('condition_id', cids)` with hundreds of 66-char IDs
  //    blows past the URL length limit (URI too long) and the whole query
  //    fails — so we CHUNK the ids into small batches.
  //  - We only override a market's count when we actually computed one; the
  //    cron now writes an accurate whale_count, so on any query miss we keep
  //    it rather than wrongly zeroing the column to "—".
  try {
    const cids = markets.map((m) => m.condition_id).filter(Boolean)
    if (cids.length) {
      const byCid = new Map()
      const CHUNK = 80 // keeps the ?condition_id=in.(...) URL well under limits
      const PAGE = 1000
      for (let i = 0; i < cids.length; i += CHUNK) {
        const chunk = cids.slice(i, i + CHUNK)
        for (let from = 0; ; from += PAGE) {
          const { data: holders, error: hErr } = await supabaseAdmin
            .from('polymarket_market_holders')
            .select('condition_id, proxy_wallet')
            .in('condition_id', chunk)
            .range(from, from + PAGE - 1)
          if (hErr || !Array.isArray(holders) || holders.length === 0) break
          for (const h of holders) {
            if (!h?.condition_id) continue
            let set = byCid.get(h.condition_id)
            if (!set) {
              set = new Set()
              byCid.set(h.condition_id, set)
            }
            if (h.proxy_wallet) set.add(h.proxy_wallet)
          }
          if (holders.length < PAGE) break
        }
      }
      for (const m of markets) {
        const set = byCid.get(m.condition_id)
        if (set) m.whale_count = set.size
      }
    }
  } catch {
    // Non-fatal — leave whatever whale_count the row already had.
  }

  return NextResponse.json({ data: markets })
}
