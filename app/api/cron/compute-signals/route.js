import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { computeUnifiedSignal } from '@/app/lib/signalEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // allow up to 60s for batch processing

/**
 * GET /api/cron/compute-signals
 * 
 * Runs every 15 minutes via Vercel cron.
 * Computes unified signals for the top active tokens and stores results
 * in the token_signals table for backtesting and UI consumption.
 * 
 * Also callable as: GET /api/cron/compute-signals?token=ETH (single token)
 */
export async function GET(req) {
  const start = Date.now()

  // Auth: require CRON_SECRET for scheduled runs
  const { searchParams } = new URL(req.url)
  const singleToken = searchParams.get('token')?.toUpperCase()
  const secret = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '')

  if (!singleToken && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: Determine which tokens to process
    const tokens = singleToken
      ? [singleToken]
      : await getActiveTokens()

    console.log(`[SignalEngine] Processing ${tokens.length} tokens: ${tokens.join(', ')}`)

    const results = []
    const errors = []

    for (const token of tokens) {
      try {
        const signal = await computeSignalForToken(token)
        results.push(signal)

        // Store in token_signals table
        await storeSignal(signal)
      } catch (err) {
        console.error(`[SignalEngine] Error processing ${token}:`, err.message)
        errors.push({ token, error: err.message })
      }
    }

    const elapsed = Date.now() - start
    console.log(`[SignalEngine] Completed ${results.length}/${tokens.length} tokens in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      elapsed_ms: elapsed,
      signals: singleToken ? results : results.map(r => ({
        token: r.token,
        signal: r.signal,
        score: r.score,
        confidence: r.confidence,
      })),
      errorDetails: errors,
    })
  } catch (err) {
    console.error('[SignalEngine] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


// ─── DATA GATHERING ──────────────────────────────────────────────────────

/**
 * Get the most active tokens in the last 24h (by CEX transaction count).
 */
async function getActiveTokens() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('token_symbol')
    .gte('timestamp', since)
    .in('counterparty_type', ['CEX', 'DEX'])
    .in('classification', ['BUY', 'SELL'])
    .not('token_symbol', 'is', null)

  if (error) {
    console.error('[SignalEngine] Error fetching active tokens:', error.message)
    return ['BTC', 'ETH', 'SOL', 'XRP', 'BNB']
  }

  // Count occurrences
  const counts = {}
  for (const row of data || []) {
    const sym = (row.token_symbol || '').toUpperCase()
    if (!sym || sym === 'UNKNOWN') continue
    counts[sym] = (counts[sym] || 0) + 1
  }

  // Sort by count, take top 30
  const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD']
  return Object.entries(counts)
    .filter(([sym]) => !STABLECOINS.includes(sym))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([sym]) => sym)
}


/**
 * Gather all data sources for a single token and compute the signal.
 */
async function computeSignalForToken(tokenSymbol) {
  // Parallel data fetching
  const [transactions, sentimentData, priceData, socialData, communityVotes] = await Promise.all([
    fetchWhaleTransactions(tokenSymbol),
    fetchSentimentScore(tokenSymbol),
    fetchPriceData(tokenSymbol),
    fetchSocialData(tokenSymbol),
    fetchCommunityVotes(tokenSymbol),
  ])

  // Build price changes object
  const priceChanges = priceData ? {
    change_1h: priceData.price_change_percentage_1h_in_currency || 0,
    change_6h: 0, // CoinGecko doesn't provide 6h natively; could interpolate
    change_24h: priceData.price_change_percentage_24h || 0,
    change_7d: priceData.price_change_percentage_7d || 0,
    change_30d: priceData.price_change_percentage_30d || 0,
  } : {}

  // Build volume data
  const volumeData = priceData ? {
    volume_24h: priceData.total_volume || 0,
    avg_volume_7d: priceData.total_volume || 0, // approximate; ideally from stored snapshots
    market_cap: priceData.market_cap || 0,
  } : {}

  // Dev activity from CoinGecko (if available)
  const devActivity = priceData?.developer_data ? {
    commits: priceData.developer_data.commit_count_4_weeks || 0,
    contributors: priceData.developer_data.contributors || 0,
  } : null

  // Run the engine
  const signal = computeUnifiedSignal({
    transactions,
    priceChanges,
    volumeData,
    sentimentData,
    socialData,
    communityVotes,
    devActivity,
    tokenSymbol,
  })

  // Attach current price for backtesting
  signal.price_at_signal = priceData?.current_price || null
  signal.market_cap = priceData?.market_cap || null

  return signal
}


// ─── DATA FETCHERS ───────────────────────────────────────────────────────

async function fetchWhaleTransactions(tokenSymbol) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48h for prev period comparison

  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,classification,usd_value,whale_address,from_address,to_address,counterparty_type,whale_score,confidence')
    .eq('token_symbol', tokenSymbol)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(500)

  if (error) {
    console.error(`[SignalEngine] Whale tx fetch error for ${tokenSymbol}:`, error.message)
    return []
  }
  return data || []
}


async function fetchSentimentScore(tokenSymbol) {
  const { data, error } = await supabaseAdmin
    .from('sentiment_scores')
    .select('score, count, timestamp')
    .eq('ticker', tokenSymbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}


async function fetchPriceData(tokenSymbol) {
  // Map common symbols to CoinGecko IDs
  const SYMBOL_TO_ID = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple',
    BNB: 'binancecoin', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
    DOT: 'polkadot', MATIC: 'matic-network', LINK: 'chainlink', UNI: 'uniswap',
    SHIB: 'shiba-inu', LTC: 'litecoin', ATOM: 'cosmos', FIL: 'filecoin',
    APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', NEAR: 'near',
    IMX: 'immutable-x', AAVE: 'aave', MKR: 'maker', CRV: 'curve-dao-token',
    SNX: 'havven', COMP: 'compound-governance-token', LDO: 'lido-dao',
    PEPE: 'pepe', WIF: 'dogwifcoin', STRK: 'starknet', FET: 'fetch-ai',
    RENDER: 'render-token', INJ: 'injective-protocol', SEI: 'sei-network',
    SUI: 'sui', TIA: 'celestia', JUP: 'jupiter-exchange-solana',
  }

  const coinId = SYMBOL_TO_ID[tokenSymbol]
  if (!coinId) return null

  try {
    const apiKey = process.env.COINGECKO_API_KEY || ''
    const baseUrl = apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3'
    const headers = apiKey ? { 'x-cg-pro-api-key': apiKey } : {}

    const res = await fetch(
      `${baseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=true&sparkline=false`,
      { headers, signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return null
    const json = await res.json()

    return {
      current_price: json.market_data?.current_price?.usd || 0,
      price_change_percentage_1h_in_currency: json.market_data?.price_change_percentage_1h_in_currency?.usd || 0,
      price_change_percentage_24h: json.market_data?.price_change_percentage_24h || 0,
      price_change_percentage_7d: json.market_data?.price_change_percentage_7d || 0,
      price_change_percentage_30d: json.market_data?.price_change_percentage_30d || 0,
      total_volume: json.market_data?.total_volume?.usd || 0,
      market_cap: json.market_data?.market_cap?.usd || 0,
      developer_data: json.developer_data || null,
      community_data: json.community_data || null,
    }
  } catch (err) {
    console.error(`[SignalEngine] CoinGecko error for ${tokenSymbol}:`, err.message)
    return null
  }
}


async function fetchSocialData(tokenSymbol) {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://lunarcrush.com/api4/public/coins/${tokenSymbol}/v1`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) return null
    const json = await res.json()
    const d = json.data

    return {
      galaxy_score: d?.galaxy_score || null,
      alt_rank: d?.alt_rank || null,
      sentiment: d?.sentiment || null,
      social_dominance: d?.social_dominance || null,
      interactions_24h: d?.interactions_24h || null,
    }
  } catch (err) {
    console.error(`[SignalEngine] LunarCrush error for ${tokenSymbol}:`, err.message)
    return null
  }
}


async function fetchCommunityVotes(tokenSymbol) {
  const { data, error } = await supabaseAdmin
    .from('sentiment_votes')
    .select('vote')
    .eq('token_symbol', tokenSymbol)
    .gte('voted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error || !data) return null

  let bullish = 0, bearish = 0, neutral = 0
  for (const row of data) {
    if (row.vote === 'bullish') bullish++
    else if (row.vote === 'bearish') bearish++
    else neutral++
  }

  return { bullish, bearish, neutral }
}


// ─── STORAGE ─────────────────────────────────────────────────────────────

async function storeSignal(signal) {
  const row = {
    token: signal.token,
    signal: signal.signal,
    score: signal.score,
    confidence: signal.confidence,
    raw_score: signal.rawScore,
    price_at_signal: signal.price_at_signal,
    market_cap: signal.market_cap,
    timeframe: signal.timeframe,
    tier1_score: signal.tiers?.tier1?.score || 0,
    tier1_confidence: signal.tiers?.tier1?.confidence || 0,
    tier2_score: signal.tiers?.tier2?.score || 0,
    tier2_confidence: signal.tiers?.tier2?.confidence || 0,
    tier3_score: signal.tiers?.tier3?.score || 0,
    tier3_confidence: signal.tiers?.tier3?.confidence || 0,
    tier4_score: signal.tiers?.tier4?.score || 0,
    tier4_confidence: signal.tiers?.tier4?.confidence || 0,
    top_factors: signal.factors,
    traps: signal.traps,
    tier1_factors: signal.tiers?.tier1?.factors || {},
    computed_at: signal.timestamp,
  }

  const { error } = await supabaseAdmin
    .from('token_signals')
    .insert(row)

  if (error) {
    console.error(`[SignalEngine] Error storing signal for ${signal.token}:`, error.message)
  }
}
