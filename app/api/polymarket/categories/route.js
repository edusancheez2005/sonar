import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Distinct non-null Polymarket categories with a live market count, used
// to build the category filter (pills / dropdown) from real data instead
// of keyword inference. Counts span the whole table, not just the page
// of markets currently shown.
export async function GET() {
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

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

  return NextResponse.json({ data: categories, total })
}
