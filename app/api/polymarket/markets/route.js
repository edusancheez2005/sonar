import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Top Polymarket markets ranked by 24h trading volume — the "what's hot
// on Polymarket" board. Whale flow + whale count travel along as signal
// columns (see PolymarketClient) but no longer drive the ordering, so the
// list stays full even where whale coverage is still sparse.
//
// PERF: we trust the cron-written `whale_count` (scripts/sync_polymarket.py)
// instead of recomputing distinct wallets from polymarket_market_holders on
// every request. That recompute was N×M chunked Supabase round-trips per page
// load — the single biggest source of slow Polymarket page loads. We also
// select only the columns the board needs (no clob_token_ids blob) and add a
// short CDN cache so bursts of viewers don't each hit the DB.
const MARKET_COLUMNS = [
  'condition_id',
  'question',
  'slug',
  'category',
  'tags',
  'competitive',
  'outcomes',
  'outcome_prices',
  'volume_24h',
  'liquidity',
  'whale_flow',
  'whale_count',
  'one_day_price_change',
  'end_date',
  'image',
  'updated_at',
].join(',')

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

  let query = supabaseAdmin.from('polymarket_markets').select(MARKET_COLUMNS)
  if (category && category !== 'all') query = query.eq('category', category)
  query = query.order(sortColumn, { ascending: false, nullsFirst: false }).limit(limit)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { data: data || [] },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } },
  )
}
