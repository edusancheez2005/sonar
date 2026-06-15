import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Distinct non-null Polymarket categories with a live market count, used
// to build the category filter (pills / dropdown) from real data instead
// of keyword inference.
//
// PERF: prefer the polymarket_category_counts() RPC (a Postgres GROUP BY,
// supabase/migrations/20260612_polymarket_data_tables.sql) instead of scanning up to 10k rows into
// Node on every request. Falls back to the in-memory scan if the function
// isn't deployed yet. Short CDN cache since categories change slowly.
export async function GET() {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const cacheHeaders = { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }

  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('polymarket_category_counts')
  if (!rpcErr && Array.isArray(rpcData)) {
    const categories = rpcData.map((r) => ({ category: r.category, count: Number(r.n || 0) }))
    const total = categories.reduce((s, c) => s + c.count, 0)
    return NextResponse.json({ data: categories, total }, { headers: cacheHeaders })
  }

  // Fallback: in-memory aggregation.
  const { data, error } = await supabaseAdmin
    .from('polymarket_markets')
    .select('category')
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = new Map()
  let total = 0
  for (const row of data || []) {
    total += 1
    const c = row?.category
    if (c) counts.set(c, (counts.get(c) || 0) + 1)
  }
  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ data: categories, total }, { headers: cacheHeaders })
}
