import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { sortFeatured } from '@/app/lib/featuredFigures'

// Famous-wallets rail data (whale research terminal + anywhere else that
// wants the A-list without a server render). Small payload, edge-cached.
export const dynamic = 'force-dynamic'
// Next's Data Cache pins Supabase GETs inside GET route handlers — without
// this, newly featured figures would never appear until a redeploy.
export const fetchCache = 'force-no-store'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, avatar_url, twitter_handle, addresses')
    .eq('submission_status', 'approved')
    .eq('is_featured', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []).filter((r) => Array.isArray(r.addresses) && r.addresses.length > 0)
  const { data: bt } = await supabaseAdmin
    .from('figure_backtests')
    .select('slug, return_pct_7d')
    .in('slug', rows.map((r) => r.slug))
  const btMap = new Map((bt || []).map((r) => [r.slug, r.return_pct_7d]))

  const figures = sortFeatured(rows).map((r) => ({
    slug: r.slug,
    display_name: r.display_name,
    category: r.category,
    avatar_url: r.avatar_url,
    twitter_handle: r.twitter_handle,
    return_pct_7d: btMap.get(r.slug) ?? null,
  }))

  return NextResponse.json(
    { figures },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
  )
}
