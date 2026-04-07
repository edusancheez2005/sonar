import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { computeUnifiedSignal } from '@/app/lib/signalEngine'
import { coinRegistry } from '@/lib/coingecko/coin-registry'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // allow up to 120s for batch processing (50 tokens)

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

  // Auth: require CRON_SECRET for all requests
  const { searchParams } = new URL(req.url)
  const singleToken = searchParams.get('token')?.toUpperCase()
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: Determine which tokens to process
    const tokens = singleToken
      ? [singleToken]
      : await getActiveTokens()

    console.log(`[SignalEngine] Processing ${tokens.length} tokens: ${tokens.join(', ')}`)

    // Market beta: fetch BTC 24h change to detect broad market regime
    // When BTC is down >2%, dampen BUY signals (market headwind)
    // When BTC is up >2%, dampen SELL signals (market tailwind)
    const btcBeta = await fetchMarketBeta()
    console.log(`[SignalEngine] Market beta: BTC 24h = ${btcBeta.btc24hChange?.toFixed(2)}%`)

    const results = []
    const errors = []

    for (const token of tokens) {
      try {
        const signal = await computeSignalForToken(token, btcBeta)
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
 * Get the most active tokens in the last 24h.
 * Counts ALL whale transactions (not just BUY/SELL) to capture transfers too.
 * Always includes top tokens even if they don't appear in whale_transactions
 * (they may be tracked via whale_alerts or per-chain tables).
 */
async function getActiveTokens() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Query all transactions (not just BUY/SELL) to get full token activity
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol')
    .gte('timestamp', since)
    .not('token_symbol', 'is', null)

  // Always-include list: top tokens that must be tracked regardless of tx count
  const ALWAYS_INCLUDE = [
    'BTC', 'ETH', 'SOL', 'BNB', 'LINK', 'UNI', 'AAVE', 'DOGE',
    'ADA', 'AVAX', 'DOT', 'MATIC', 'ARB', 'OP', 'SUI', 'NEAR',
    'PEPE', 'SHIB', 'WBTC', 'WETH', 'INJ', 'FET', 'RENDER',
  ]

  if (error) {
    console.error('[SignalEngine] Error fetching active tokens:', error.message)
    return ALWAYS_INCLUDE.slice(0, 30)
  }

  // Count occurrences
  const counts = {}
  for (const row of data || []) {
    const sym = (row.token_symbol || '').toUpperCase()
    if (!sym || sym === 'UNKNOWN') continue
    counts[sym] = (counts[sym] || 0) + 1
  }

  // Sort by count, take top 40
  const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']
  const active = Object.entries(counts)
    .filter(([sym]) => !STABLECOINS.includes(sym))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([sym]) => sym)

  // Merge always-include tokens that aren't already in the active list
  const tokenSet = new Set(active)
  for (const sym of ALWAYS_INCLUDE) {
    if (!tokenSet.has(sym) && !STABLECOINS.includes(sym)) {
      tokenSet.add(sym)
    }
  }

  // Return up to 50 tokens (more coverage)
  return [...tokenSet].slice(0, 50)
}


/**
 * Gather all data sources for a single token and compute the signal.
 */
async function computeSignalForToken(tokenSymbol, btcBeta = {}) {
  // Parallel data fetching — use cached price snapshots first, CoinGecko as fallback
  const [transactions, sentimentData, cachedPrice, socialData, communityVotes] = await Promise.all([
    fetchWhaleTransactions(tokenSymbol),
    fetchSentimentScore(tokenSymbol),
    fetchCachedPrice(tokenSymbol),
    fetchSocialData(tokenSymbol),
    fetchCommunityVotes(tokenSymbol),
  ])

  // If cached price exists, use it. Otherwise fall back to CoinGecko API.
  let priceData = null
  if (cachedPrice) {
    priceData = cachedPrice
  } else {
    priceData = await fetchPriceData(tokenSymbol)
  }

  // Build price changes object
  const priceChanges = priceData ? {
    change_1h: priceData.price_change_percentage_1h_in_currency || 0,
    change_6h: 0, // CoinGecko doesn't provide 6h natively
    change_24h: priceData.price_change_percentage_24h || 0,
    change_7d: priceData.price_change_percentage_7d || 0,
    change_30d: priceData.price_change_percentage_30d || 0,
  } : {}

  // Build volume data
  const volumeData = priceData ? {
    volume_24h: priceData.total_volume || 0,
    avg_volume_7d: priceData.avg_volume_7d || priceData.total_volume || 0,
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

  // Market beta adjustment: dampen signals that fight the broad market trend
  // This is a quant-standard risk adjustment — individual signals should account for market regime
  const btc24h = btcBeta.btc24hChange || 0
  if (tokenSymbol !== 'BTC' && tokenSymbol !== 'WBTC') {
    const isBullish = signal.signal === 'STRONG BUY' || signal.signal === 'BUY'
    const isBearish = signal.signal === 'STRONG SELL' || signal.signal === 'SELL'

    // v3: Market down >1% and signal is BUY → apply headwind penalty (lowered from 2%)
    // Alts bleed 2-3x harder than BTC, so even a -1% BTC move is significant
    if (btc24h < -1 && isBullish) {
      const penalty = Math.min(20, Math.abs(btc24h) * 3)
      signal.rawScore = Math.max(-100, (signal.rawScore || 0) - penalty)
      signal.score = Math.round(Math.max(0, Math.min(100, (signal.rawScore + 100) / 2)))
      if (signal.score < 65) signal.signal = 'NEUTRAL'
      else if (signal.score < 80) signal.signal = 'BUY'
      signal.traps = [...(signal.traps || []), { type: 'Market Headwind', severity: 'MEDIUM', adjustment: -Math.round(penalty), description: `BTC down ${btc24h.toFixed(1)}% - market headwind dampens bullish signals` }]
    }

    // v3: Market up >1% and signal is SELL → apply tailwind dampening
    if (btc24h > 1 && isBearish) {
      const boost = Math.min(15, btc24h * 2)
      signal.rawScore = Math.min(100, (signal.rawScore || 0) + boost)
      signal.score = Math.round(Math.max(0, Math.min(100, (signal.rawScore + 100) / 2)))
      if (signal.score > 35) signal.signal = 'NEUTRAL'
      else if (signal.score > 20) signal.signal = 'SELL'
    }
  }

  return signal
}

/**
 * Fetch BTC 24h change as a market regime indicator.
 * Used for market beta adjustment on individual token signals.
 */
async function fetchMarketBeta() {
  try {
    const { data } = await supabaseAdmin
      .from('price_snapshots')
      .select('price_change_24h')
      .eq('ticker', 'BTC')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    return { btc24hChange: data?.price_change_24h || 0 }
  } catch {
    return { btc24hChange: 0 }
  }
}


// ─── DATA FETCHERS ───────────────────────────────────────────────────────

async function fetchWhaleTransactions(tokenSymbol) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48h for prev period comparison

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
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


/**
 * Fetch price data from cached price_snapshots table (updated every 15min by fetch-prices cron).
 * Returns data in the same shape as fetchPriceData() for seamless fallback.
 * Also computes real 7d average volume and 1h price change from historical snapshots.
 */
async function fetchCachedPrice(tokenSymbol) {
  try {
    // Get the latest snapshot
    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('price_snapshots')
      .select('price_usd, market_cap, volume_24h, price_change_24h, timestamp')
      .eq('ticker', tokenSymbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestErr || !latest || !latest.price_usd) return null

    // Get snapshot from ~1 hour ago for 1h price change
    const oneHourAgo = new Date(Date.now() - 75 * 60 * 1000).toISOString() // 75min to allow for timing
    const { data: hourAgoSnap } = await supabaseAdmin
      .from('price_snapshots')
      .select('price_usd')
      .eq('ticker', tokenSymbol)
      .lte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    const priceChange1h = hourAgoSnap?.price_usd
      ? ((latest.price_usd - hourAgoSnap.price_usd) / hourAgoSnap.price_usd) * 100
      : 0

    // Get 7d average volume from snapshots (one snapshot per day approx)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: volumeSnaps } = await supabaseAdmin
      .from('price_snapshots')
      .select('volume_24h')
      .eq('ticker', tokenSymbol)
      .gte('timestamp', sevenDaysAgo)
      .not('volume_24h', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(50) // ~50 snapshots in 7d at 15min intervals ≈ 672, but we just need a sample

    let avgVolume7d = latest.volume_24h || 0
    if (volumeSnaps && volumeSnaps.length > 1) {
      const volumes = volumeSnaps.map(s => Number(s.volume_24h) || 0).filter(v => v > 0)
      if (volumes.length > 0) {
        avgVolume7d = volumes.reduce((sum, v) => sum + v, 0) / volumes.length
      }
    }

    // Get snapshot from ~7 days ago for 7d price change
    const { data: weekAgoSnap } = await supabaseAdmin
      .from('price_snapshots')
      .select('price_usd')
      .eq('ticker', tokenSymbol)
      .lte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    const priceChange7d = weekAgoSnap?.price_usd
      ? ((latest.price_usd - weekAgoSnap.price_usd) / weekAgoSnap.price_usd) * 100
      : 0

    return {
      current_price: latest.price_usd,
      price_change_percentage_1h_in_currency: priceChange1h,
      price_change_percentage_24h: latest.price_change_24h || 0,
      price_change_percentage_7d: priceChange7d,
      price_change_percentage_30d: 0, // Not available from snapshots
      total_volume: latest.volume_24h || 0,
      avg_volume_7d: avgVolume7d,
      market_cap: latest.market_cap || 0,
      developer_data: null, // Not in snapshots
      community_data: null,
    }
  } catch (err) {
    console.error(`[SignalEngine] Cached price fetch failed for ${tokenSymbol}:`, err.message)
    return null
  }
}


async function fetchPriceData(tokenSymbol) {
  // Static fallback map for when coinRegistry is unavailable
  const SYMBOL_TO_ID = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple',
    BNB: 'binancecoin', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
    DOT: 'polkadot', MATIC: 'matic-network', POL: 'matic-network',
    LINK: 'chainlink', UNI: 'uniswap', SHIB: 'shiba-inu', LTC: 'litecoin',
    ATOM: 'cosmos', FIL: 'filecoin', APT: 'aptos', ARB: 'arbitrum',
    OP: 'optimism', NEAR: 'near', IMX: 'immutable-x', AAVE: 'aave',
    MKR: 'maker', CRV: 'curve-dao-token', SNX: 'havven',
    COMP: 'compound-governance-token', LDO: 'lido-dao', PEPE: 'pepe',
    WIF: 'dogwifcoin', STRK: 'starknet', FET: 'fetch-ai', 'RENDER': 'render-token',
    INJ: 'injective-protocol', SEI: 'sei-network', SUI: 'sui', TIA: 'celestia',
    JUP: 'jupiter-exchange-solana', TRX: 'tron', BONK: 'bonk',
    JTO: 'jito-governance-token', PYTH: 'pyth-network', RAY: 'raydium',
    ORCA: 'orca', ETC: 'ethereum-classic', XLM: 'stellar', HBAR: 'hedera-hashgraph',
    VET: 'vechain', ICP: 'internet-computer', ALGO: 'algorand',
    GRT: 'the-graph', SAND: 'the-sandbox', MANA: 'decentraland',
    AXS: 'axie-infinity', ENS: 'ethereum-name-service', SUSHI: 'sushi',
    BAL: 'balancer', YFI: 'yearn-finance', '1INCH': '1inch',
    BAT: 'basic-attention-token', ZRX: '0x', GALA: 'gala', ENJ: 'enjincoin',
    CHZ: 'chiliz', DYDX: 'dydx', GMX: 'gmx', RUNE: 'thorchain',
    FTM: 'fantom', STX: 'blockstack', KAS: 'kaspa', TAO: 'bittensor',
    RNDR: 'render-token', WLD: 'worldcoin-wld', JASMY: 'jasmycoin',
    ENA: 'ethena', PENDLE: 'pendle', ONDO: 'ondo-finance', FLOKI: 'floki',
    TON: 'the-open-network', THETA: 'theta-token', 'RPL': 'rocket-pool',
    WETH: 'weth', WBTC: 'wrapped-bitcoin', STETH: 'staked-ether',
    ETHFI: 'ether-fi', EIGEN: 'eigenlayer', SSV: 'ssv-network',
    W: 'wormhole', MANTA: 'manta-network', DYM: 'dymension',
    PIXEL: 'pixel-game', PORTAL: 'portal-2', ALT: 'altlayer',
  }

  // Try coinRegistry first (dynamic resolution with search fallback)
  let coinId = SYMBOL_TO_ID[tokenSymbol]
  if (!coinId) {
    try {
      const metadata = await coinRegistry.resolve(tokenSymbol)
      if (metadata) coinId = metadata.id
    } catch (err) {
      console.warn(`[SignalEngine] coinRegistry resolve failed for ${tokenSymbol}:`, err.message)
    }
  }

  if (!coinId) {
    console.warn(`[SignalEngine] No CoinGecko ID for ${tokenSymbol}`)
    return null
  }

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
    .from('token_sentiment_votes')
    .select('vote')
    .eq('token_symbol', tokenSymbol)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

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
    throw new Error(`Storage failed for ${signal.token}: ${error.message}`)
  }
}
