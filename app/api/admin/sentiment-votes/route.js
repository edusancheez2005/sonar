import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to view sentiment votes
 * GET /api/admin/sentiment-votes?symbol=BTC&limit=100
 * 
 * Query params:
 * - symbol (optional): Filter by token symbol
 * - limit (optional): Number of records to return (default 100, max 500)
 * - days (optional): Number of days to look back (default 7)
 */
export async function GET(req) {
  try {
    // Check if user is admin
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you can add your admin email check here)
    const adminEmails = [
      'eduardo@sonartracker.io',
      'edusancheez2005@gmail.com'
    ]
    
    if (!adminEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const days = parseInt(searchParams.get('days') || '7')
    
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Build query
    let query = supabaseAdmin
      .from('token_sentiment_votes')
      .select('*')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (symbol) {
      query = query.eq('token_symbol', symbol)
    }

    const { data, error } = await query

    if (error) {
      console.error('Admin sentiment votes fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
    }

    // Get aggregated stats
    const statsQuery = symbol 
      ? supabaseAdmin
          .from('token_sentiment_votes')
          .select('token_symbol, vote')
          .eq('token_symbol', symbol)
          .gte('created_at', sinceDate)
      : supabaseAdmin
          .from('token_sentiment_votes')
          .select('token_symbol, vote')
          .gte('created_at', sinceDate)

    const { data: statsData } = await statsQuery

    // Aggregate by token and vote type
    const aggregated = {}
    for (const row of statsData || []) {
      if (!aggregated[row.token_symbol]) {
        aggregated[row.token_symbol] = { bullish: 0, bearish: 0, neutral: 0, total: 0 }
      }
      aggregated[row.token_symbol][row.vote] += 1
      aggregated[row.token_symbol].total += 1
    }

    return NextResponse.json({
      success: true,
      filters: { symbol, days, limit },
      totalRecords: data.length,
      aggregated,
      votes: data.map(v => ({
        id: v.id,
        token: v.token_symbol,
        vote: v.vote,
        email: v.voter_email || 'Anonymous',
        fingerprint: v.voter_fingerprint ? `${v.voter_fingerprint.slice(0, 8)}...` : null,
        comment: v.comments,
        source: v.source,
        timestamp: v.created_at
      }))
    })
  } catch (error) {
    console.error('Admin sentiment votes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

