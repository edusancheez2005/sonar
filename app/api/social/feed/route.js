import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/social/feed
 * Returns the social feed — top crypto posts/tweets from influencers.
 * 
 * Query params:
 *   - category: filter by category (cryptocurrencies, defi, nfts, memecoins, tracked_creator)
 *   - creator: filter by screen_name
 *   - ticker: filter posts mentioning a specific ticker
 *   - limit: max results (default 50, max 200)
 *   - sort: interactions (default) | recent
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const creator = searchParams.get('creator')
    const ticker = searchParams.get('ticker')?.toUpperCase()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const sort = searchParams.get('sort') || 'interactions'

    let query = supabaseAdmin
      .from('social_posts')
      .select('*')
      .not('body', 'is', null)

    if (category) {
      query = query.eq('category', category)
    }

    if (creator) {
      query = query.ilike('creator_screen_name', `%${creator}%`)
    }

    if (ticker) {
      query = query.contains('tickers_mentioned', [ticker])
    }

    if (sort === 'recent') {
      query = query.order('published_at', { ascending: false })
    } else {
      query = query.order('interactions', { ascending: false })
    }

    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      posts: data || [],
      count: data?.length || 0,
    }, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' }
    })
  } catch (err) {
    console.error('[Social Feed API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
