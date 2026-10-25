import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function parseSince(raw) {
  if (!raw) return null
  const m = /^(\d{1,3})([hd])$/.exec(raw.trim())
  if (m) return new Date(Date.now() - Number(m[1]) * (m[2] === 'h' ? 3_600_000 : 86_400_000)).toISOString()
  const t = Date.parse(raw)
  return Number.isFinite(t) ? new Date(t).toISOString() : false
}

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
 *   - since: 48h | 7d | ISO timestamp (optional; unbounded when absent)
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
      // tickers_mentioned is JSONB — containment needs a JSON literal, not a
      // JS array (which PostgREST sends as cs.{BTC}, rejected as invalid JSON).
      query = query.contains('tickers_mentioned', JSON.stringify([ticker]))
    }

    // Optional time bound: since=48h | 7d | <ISO>. Without it the feed stays
    // unbounded (NewsTerminal relies on that); "most shared" with no bound
    // returned posts from February to June.
    const since = parseSince(searchParams.get('since'))
    if (since === false) return NextResponse.json({ error: 'since must be like 48h, 7d or an ISO time' }, { status: 400 })
    if (since) query = query.gte('published_at', since)

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
    const nonLatinBlock = /[\u0400-\u04FF\u0600-\u06FF\u0980-\u09FF\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/
    const isEnglish = (text) => {
      if (!text) return false
      // Reject if contains Cyrillic, Arabic, Korean, Japanese, Chinese, etc.
      if (nonLatinBlock.test(text)) return false
      // Also reject if text stripped of URLs, @mentions, #hashtags has >15% non-ASCII
      const stripped = text.replace(/https?:\/\/\S+/g, '').replace(/@\w+/g, '').replace(/#\w+/g, '').trim()
      if (!stripped) return false
      const nonAscii = stripped.replace(/[\x00-\x7F]/g, '').length
      return nonAscii / stripped.length < 0.15
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
