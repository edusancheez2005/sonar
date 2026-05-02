import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/news/personalized?tokens=ETH,SOL&limit=20
 * Latest news_items filtered to a user's token set.
 */
export async function GET(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`news-personalized:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const { searchParams } = new URL(req.url)
  const tokensParam = searchParams.get('tokens')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  if (!tokensParam) return NextResponse.json({ data: [] })

  const tokens = tokensParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50)
  if (tokens.length === 0) return NextResponse.json({ data: [] })

  const { data, error } = await supabaseAdmin
    .from('news_items')
    .select('id, title, url, ticker, source, published_at, sentiment_llm, sentiment_raw')
    .in('ticker', tokens)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Drop junk titles
  const nonLatinBlock = /[\u0400-\u04FF\u0600-\u06FF\u0980-\u09FF\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/
  const filtered = (data || []).filter((a) => {
    const t = (a.title || '').trim()
    if (!t || t.toLowerCase() === 'untitled' || t.length < 15) return false
    if (nonLatinBlock.test(t)) return false
    return true
  })

  return NextResponse.json({ data: filtered, tokens })
}
