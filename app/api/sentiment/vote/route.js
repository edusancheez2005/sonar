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

// Generate randomized baseline votes to simulate realistic community activity
// This creates pseudo-random but consistent values based on token symbol
function generateBaselineVotes(symbol) {
  // Use symbol as seed for consistent randomization
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Pseudo-random number generator with seed
  const random = (seed) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }
  
  // Token tier based on market importance (affects vote count)
  const majorTokens = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'MATIC', 'DOT', 'LINK']
  const midCapTokens = ['UNI', 'ATOM', 'LTC', 'AVAX', 'SHIB', 'TRX', 'AAVE', 'CRV', 'SUSHI', 'COMP']
  const stablecoins = ['DAI', 'USDC', 'USDT', 'USDE', 'GUSD', 'TUSD']
  
  let baseTotal, sentimentBias
  
  if (majorTokens.includes(symbol)) {
    // Major tokens: 2000-5000 total votes, slight bullish bias
    baseTotal = 2000 + Math.floor(random(hash) * 3000)
    sentimentBias = 0.55 + random(hash + 1) * 0.20 // 55-75% bullish
  } else if (midCapTokens.includes(symbol)) {
    // Mid-cap: 500-1500 total votes, mixed sentiment
    baseTotal = 500 + Math.floor(random(hash) * 1000)
    sentimentBias = 0.45 + random(hash + 2) * 0.30 // 45-75% bullish
  } else if (stablecoins.includes(symbol)) {
    // Stablecoins: 200-500 votes, neutral
    baseTotal = 200 + Math.floor(random(hash) * 300)
    sentimentBias = 0.48 + random(hash + 3) * 0.04 // 48-52% (nearly neutral)
  } else {
    // Small cap/other: 100-400 votes, variable sentiment
    baseTotal = 100 + Math.floor(random(hash) * 300)
    sentimentBias = 0.35 + random(hash + 4) * 0.40 // 35-75% bullish
  }
  
  const bullish = Math.floor(baseTotal * sentimentBias)
  const bearish = baseTotal - bullish
  
  return { bullish, bearish }
}

// Cache baseline votes per session to avoid recalculating
const BASELINE_CACHE = {}

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

  // Add baseline votes using randomized generator (cached per symbol)
  if (!BASELINE_CACHE[symbol]) {
    BASELINE_CACHE[symbol] = generateBaselineVotes(symbol)
  }
  const baseline = BASELINE_CACHE[symbol]
  breakdown.bullish += baseline.bullish
  breakdown.bearish += baseline.bearish

  const total = breakdown.bullish + breakdown.bearish + breakdown.neutral
  return { symbol, total, breakdown }
}

