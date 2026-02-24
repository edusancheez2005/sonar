/**
 * API Route: Get news articles for a specific token
 * Queries the news_items table (populated by CryptoPanic + LunarCrush ingestion)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()
    const limit = Math.min(Number(searchParams.get('limit') || 10), 20)

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query news_items for this token, most recent first
    const { data: articles, error } = await supabase
      .from('news_items')
      .select('title, url, source, published_at, sentiment_raw, sentiment_llm, author, metadata')
      .eq('ticker', symbol)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('News query error:', error)
      return NextResponse.json({ articles: [], total: 0 })
    }

    const formatted = (articles || []).map(a => ({
      title: a.title || 'Untitled',
      url: a.url || '',
      source: a.source || 'unknown',
      published_at: a.published_at,
      sentiment: a.sentiment_llm ?? a.sentiment_raw ?? null,
      author: a.author || null,
    }))

    return NextResponse.json({
      articles: formatted,
      total: formatted.length,
      symbol,
    })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', articles: [], total: 0 },
      { status: 500 }
    )
  }
}
