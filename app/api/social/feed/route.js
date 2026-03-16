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

    // Filter to English-only and crypto-relevant posts
    const isEnglish = (text) => {
      if (!text) return false
      // Reject if >20% non-ASCII characters (catches CJK, Cyrillic, Arabic, Korean, etc.)
      const nonAscii = text.replace(/[\x00-\x7F]/g, '').length
      return nonAscii / text.length < 0.2
    }

    const cryptoKeywords = /bitcoin|btc|ethereum|eth|solana|sol|crypto|blockchain|defi|nft|token|altcoin|whale|trading|market cap|binance|coinbase|bull|bear|pump|dump|hodl|airdrop|staking|yield|liquidity|dex|cex|memecoin|shib|doge|pepe|xrp|cardano|ada|avax|polygon|arbitrum|optimism|chain|wallet|exchange|futures|options|leverage|short|long|rally|correction|ath|fomo|fud|saylor|blackrock|etf|sec|fed|tariff|inflation|rate cut|macro/i

    const filtered = (data || []).filter(post => {
      const body = post.body || ''
      if (!isEnglish(body)) return false
      // Must be crypto-related: check body, category, or tickers
      if (post.tickers_mentioned?.length > 0) return true
      if (post.category && ['cryptocurrencies', 'defi', 'nfts', 'memecoins'].includes(post.category)) return true
      if (cryptoKeywords.test(body)) return true
      return false
    })

    return NextResponse.json({
      posts: filtered,
      count: filtered.length,
    }, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' }
    })
  } catch (err) {
    console.error('[Social Feed API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
