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
    const cleanFingerprint = fingerprint?.trim()

    if (!symbol || !VALID_VOTES.includes(voteValue)) {
      return NextResponse.json({ error: 'Invalid token or vote option.' }, { status: 400 })
    }

    if (!cleanEmail && !cleanFingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint missing. Please refresh and try again.' },
        { status: 400 }
      )
    }

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
      }
    }

    const lookbackIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let existingQuery = supabaseAdmin
      .from('token_sentiment_votes')
      .select('id')
      .eq('token_symbol', symbol)
      .gte('created_at', lookbackIso)

    if (cleanEmail && cleanFingerprint) {
      existingQuery = existingQuery.or(`voter_email.eq.${cleanEmail},voter_fingerprint.eq.${cleanFingerprint}`)
    } else if (cleanEmail) {
      existingQuery = existingQuery.eq('voter_email', cleanEmail)
    } else if (cleanFingerprint) {
      existingQuery = existingQuery.eq('voter_fingerprint', cleanFingerprint)
    }

    const { data: existing, error: existingError } = await existingQuery.limit(1)
    if (existingError) {
      console.error('Sentiment duplicate check error:', existingError)
    }
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Looks like you already voted today. Check back tomorrow!' },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin
      .from('token_sentiment_votes')
      .insert({
        token_symbol: symbol,
        vote: voteValue,
        voter_email: cleanEmail || null,
        comments: comment?.trim() || null,
        voter_fingerprint: cleanFingerprint || null,
        source: source || 'token_page'
      })

    if (error) {
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

// Baseline votes to pre-populate sentiment (simulating community activity)
const BASELINE_VOTES = {
  // Major tokens with higher baseline
  'BTC': { bullish: 3847, bearish: 1523 },
  'ETH': { bullish: 4125, bearish: 1687 },
  'SOL': { bullish: 2934, bearish: 1456 },
  'BNB': { bullish: 2156, bearish: 987 },
  'XRP': { bullish: 1876, bearish: 1234 },
  'DOGE': { bullish: 2543, bearish: 1098 },
  'ADA': { bullish: 1987, bearish: 1234 },
  'MATIC': { bullish: 1654, bearish: 876 },
  'DOT': { bullish: 1432, bearish: 798 },
  'LINK': { bullish: 1876, bearish: 654 },
  
  // Mid-cap tokens
  'UNI': { bullish: 987, bearish: 543 },
  'ATOM': { bullish: 765, bearish: 432 },
  'LTC': { bullish: 1234, bearish: 567 },
  'AVAX': { bullish: 1098, bearish: 654 },
  'SHIB': { bullish: 1543, bearish: 876 },
  'TRX': { bullish: 876, bearish: 543 },
  'DAI': { bullish: 234, bearish: 187 },
  'USDC': { bullish: 312, bearish: 267 },
  'USDT': { bullish: 287, bearish: 234 },
  
  // Default for other tokens
  '_DEFAULT': { bullish: 142, bearish: 87 }
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

  // Add baseline votes to simulate community activity
  const baseline = BASELINE_VOTES[symbol] || BASELINE_VOTES['_DEFAULT']
  breakdown.bullish += baseline.bullish
  breakdown.bearish += baseline.bearish

  const total = breakdown.bullish + breakdown.bearish + breakdown.neutral
  return { symbol, total, breakdown }
}

