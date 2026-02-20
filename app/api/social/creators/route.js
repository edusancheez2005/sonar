import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/social/creators
 * Returns top crypto influencers/creators ranked by engagement.
 * 
 * Query params:
 *   - limit: max results (default 50, max 200)
 *   - sort: interactions (default) | followers
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const sort = searchParams.get('sort') || 'interactions'

    const orderCol = sort === 'followers' ? 'followers' : 'interactions_24h'

    const { data, error } = await supabaseAdmin
      .from('social_creators')
      .select('*')
      .gt(orderCol, 0)
      .order(orderCol, { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      creators: data || [],
      count: data?.length || 0,
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    console.error('[Social Creators API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
