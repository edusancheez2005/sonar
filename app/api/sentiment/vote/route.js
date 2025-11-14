import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const VALID_VOTES = ['bullish', 'bearish', 'neutral']

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
    }

    const stats = await fetchStats(symbol)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Sentiment GET error:', error)
    return NextResponse.json({ error: 'Failed to load sentiment' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { tokenSymbol, vote, email, comment, fingerprint, source } = await req.json()
    const symbol = tokenSymbol?.toUpperCase()
    const voteValue = vote?.toLowerCase()
    const cleanEmail = email?.trim().toLowerCase()

    if (!symbol || !VALID_VOTES.includes(voteValue)) {
      return NextResponse.json({ error: 'Invalid token or vote option.' }, { status: 400 })
    }

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required to vote.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('token_sentiment_votes')
      .insert({
        token_symbol: symbol,
        vote: voteValue,
        voter_email: cleanEmail,
        comments: comment?.trim() || null,
        voter_fingerprint: fingerprint || null,
        source: source || 'token_page'
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Looks like you already voted today. Check back tomorrow!' },
          { status: 409 }
        )
      }
      console.error('Sentiment vote insert error:', error)
      return NextResponse.json({ error: 'Failed to record vote.' }, { status: 500 })
    }

    const stats = await fetchStats(symbol)
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('Sentiment POST error:', error)
    return NextResponse.json({ error: 'Failed to submit vote.' }, { status: 500 })
  }
}

async function fetchStats(symbol) {
  const { data, error } = await supabaseAdmin
    .from('token_sentiment_votes')
    .select('vote')
    .eq('token_symbol', symbol)

  if (error) {
    console.error('Sentiment fetch error:', error)
    return { symbol, total: 0, breakdown: { bullish: 0, bearish: 0, neutral: 0 } }
  }

  const breakdown = { bullish: 0, bearish: 0, neutral: 0 }
  for (const row of data || []) {
    if (breakdown[row.vote] !== undefined) {
      breakdown[row.vote] += 1
    }
  }

  const total = breakdown.bullish + breakdown.bearish + breakdown.neutral
  return { symbol, total, breakdown }
}

