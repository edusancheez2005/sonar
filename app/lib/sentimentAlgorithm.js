/**
 * Enhanced Unified Sentiment Algorithm v2.0
 * Multi-source scoring: Whale data, Price action, LunarCrush social,
 * CoinGecko community, Multi-timeframe momentum, Volume analysis
 */

export function calculateEnhancedSentiment({
  transactions = [],
  priceData = null,
  newsData = null,
  // v2 inputs (all optional — backward compatible)
  lunarcrush = null,        // { galaxy_score, alt_rank, sentiment, social_dominance, interactions_24h }
  coingeckoSentiment = null, // { votes_up_pct, volume_to_mcap_ratio }
  priceMultiframe = null     // { change_1h, change_24h, change_7d, change_14d, change_30d }
}) {
  if (!transactions || transactions.length === 0) {
    // Even without whale data, if we have other sources, still compute
    const hasAlternateData = lunarcrush || coingeckoSentiment || priceMultiframe || priceData
    if (!hasAlternateData) {
      return {
        label: 'NEUTRAL',
        color: '#ffab00',
        score: 0,
        confidence: 0,
        divergence: false,
        components: {},
        details: {}
      }
    }
  }

  // ═══ 1. WHALE TRANSACTION ANALYSIS ═══
  const nowMs = Date.now()
  const sixH = 6 * 60 * 60 * 1000
  const last6Start = nowMs - sixH
  const prev6Start = nowMs - 2 * sixH

  let buys = 0, sells = 0, buyVol = 0, sellVol = 0, net = 0
  const txSizes = []
  let last6Net = 0, prev6Net = 0

  for (const tx of (transactions || [])) {
    const usd = Number(tx.usd_value || 0)
    const side = String(tx.classification || '').toLowerCase()
    const ts = new Date(tx.timestamp).getTime()
    
    txSizes.push(Math.abs(usd))
    
    if (side === 'buy') {
      buys += 1; buyVol += usd; net += usd
    } else if (side === 'sell') {
      sells += 1; sellVol += usd; net -= usd
    }
    
    if (ts >= last6Start) {
      last6Net += (side === 'sell' ? -usd : usd)
    } else if (ts >= prev6Start && ts < last6Start) {
      prev6Net += (side === 'sell' ? -usd : usd)
    }
  }

  const total = buys + sells
  const buyPct = total > 0 ? (buys / total) * 100 : 50
  
  const median = computeMedian(txSizes) || 1
  const scaleNet = Math.max(1, median * 20)
  const scaleMom = Math.max(1, median * 10)

  // Whale components [-1, 1]
  const whaleBias = (buyPct - 50) / 50
  const whaleNetFlow = Math.tanh(net / scaleNet)
  const whaleMomentum = Math.tanh((last6Net - prev6Net) / scaleMom)

  // ═══ 2. PRICE MOMENTUM (single-frame — legacy) ═══
  let priceMomentum = 0
  if (priceData) {
    const change24h = Number(priceData.change24h) || 0
    const change7d = Number(priceData.change7d) || 0
    priceMomentum = Math.tanh(change24h / 10)
    const trend7d = Math.tanh(change7d / 20)
    priceMomentum = (priceMomentum + trend7d) / 2
  }

  // ═══ 3. NEWS SENTIMENT ═══
  let newsSentiment = 0
  let newsCount = 0
  if (newsData && Array.isArray(newsData)) {
    const positiveWords = ['bullish', 'surge', 'rally', 'gain', 'soar', 'breakout', 'pump', 'growth', 'positive', 'upgrade', 'adoption', 'partnership', 'outperform', 'accumulate', 'milestone']
    const negativeWords = ['bearish', 'crash', 'dump', 'drop', 'fall', 'plunge', 'decline', 'sell-off', 'warning', 'risk', 'scam', 'hack', 'negative', 'downgrade', 'liquidation', 'exploit']
    
    for (const article of newsData) {
      const text = `${article.title || ''} ${article.description || ''}`.toLowerCase()
      let score = 0
      for (const word of positiveWords) { if (text.includes(word)) score += 1 }
      for (const word of negativeWords) { if (text.includes(word)) score -= 1 }
      if (score !== 0) { newsSentiment += Math.sign(score); newsCount += 1 }
    }
    if (newsCount > 0) {
      newsSentiment = Math.tanh(newsSentiment / Math.max(newsCount, 3))
    }
  }

  // ═══ 4. LUNARCRUSH SOCIAL INTELLIGENCE (NEW) ═══
  let socialSentiment = 0
  let galaxyScoreSignal = 0
  
  if (lunarcrush) {
    // LunarCrush sentiment: 0-100 (% positive) → normalize to [-1, 1]
    if (lunarcrush.sentiment != null && lunarcrush.sentiment > 0) {
      socialSentiment = (lunarcrush.sentiment - 50) / 50  // 50% = neutral
    }
    
    // Galaxy Score: 0-100 proprietary composite → normalize to [-1, 1]
    // 50 = neutral, above = bullish signal, below = bearish
    if (lunarcrush.galaxy_score != null && lunarcrush.galaxy_score > 0) {
      galaxyScoreSignal = (lunarcrush.galaxy_score - 50) / 50
    }
  }

  // ═══ 5. COINGECKO COMMUNITY VOTE (NEW) ═══
  let communityVote = 0
  let volumeIntensity = 0
  
  if (coingeckoSentiment) {
    // CoinGecko user votes: votes_up_pct is 0-100 → normalize to [-1, 1]
    if (coingeckoSentiment.votes_up_pct != null) {
      communityVote = (coingeckoSentiment.votes_up_pct - 50) / 50
    }
    
    // Volume/MCap ratio: > 0.1 = very active, < 0.01 = low activity
    // Compare to "normal" (0.05) — high volume during movements confirms direction
    if (coingeckoSentiment.volume_to_mcap_ratio != null && priceData) {
      const ratio = coingeckoSentiment.volume_to_mcap_ratio
      const priceDirection = Math.sign(Number(priceData.change24h) || 0)
      // High volume in direction of price = confirming signal
      // High volume against price = divergence
      const volumeStrength = Math.tanh((ratio - 0.05) / 0.05) // normalize around 0.05
      volumeIntensity = volumeStrength * priceDirection * 0.5 // dampen
    }
  }

  // ═══ 6. MULTI-TIMEFRAME MOMENTUM (NEW) ═══
  let multiframeMomentum = 0
  
  if (priceMultiframe) {
    // Weighted average: recent frames matter more
    const frames = [
      { change: priceMultiframe.change_1h, weight: 0.10 },
      { change: priceMultiframe.change_24h, weight: 0.25 },
      { change: priceMultiframe.change_7d, weight: 0.30 },
      { change: priceMultiframe.change_14d, weight: 0.20 },
      { change: priceMultiframe.change_30d, weight: 0.15 },
    ]
    
    let weightedSum = 0, totalWeight = 0
    for (const f of frames) {
      if (f.change != null && !isNaN(f.change)) {
        // Normalize each to [-1, 1] (±20% = full signal)
        weightedSum += Math.tanh(f.change / 20) * f.weight
        totalWeight += f.weight
      }
    }
    if (totalWeight > 0) {
      multiframeMomentum = weightedSum / totalWeight
    }
  }

  // ═══ 7. UNIFIED SCORING ═══
  const hasWhaleData = transactions && transactions.length > 0
  const hasLunarCrush = lunarcrush && (lunarcrush.galaxy_score > 0 || lunarcrush.sentiment > 0)
  const hasCoinGecko = coingeckoSentiment && coingeckoSentiment.votes_up_pct != null
  const hasMultiframe = priceMultiframe && priceMultiframe.change_7d != null
  
  // Dynamic weights — redistribute based on available data
  const weights = {
    whaleBias:          hasWhaleData ? 0.18 : 0,
    whaleNetFlow:       hasWhaleData ? 0.15 : 0,
    whaleMomentum:      hasWhaleData ? 0.10 : 0,
    priceMomentum:      priceData ? 0.10 : 0,
    multiframeMomentum: hasMultiframe ? 0.10 : 0,
    socialSentiment:    hasLunarCrush ? 0.10 : 0,
    galaxyScore:        hasLunarCrush ? 0.08 : 0,
    newsSentiment:      newsCount > 0 ? 0.07 : 0,
    communityVote:      hasCoinGecko ? 0.05 : 0,
    volumeIntensity:    hasCoinGecko ? 0.07 : 0,
  }

  // Normalize to sum to 1.0
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)
  if (totalWeight > 0 && totalWeight < 1) {
    const scale = 1 / totalWeight
    for (const k in weights) weights[k] *= scale
  }

  const components = {
    whaleBias, whaleNetFlow, whaleMomentum,
    priceMomentum, multiframeMomentum,
    socialSentiment, galaxyScore: galaxyScoreSignal,
    newsSentiment, communityVote, volumeIntensity
  }

  let score =
    (weights.whaleBias * whaleBias) +
    (weights.whaleNetFlow * whaleNetFlow) +
    (weights.whaleMomentum * whaleMomentum) +
    (weights.priceMomentum * priceMomentum) +
    (weights.multiframeMomentum * multiframeMomentum) +
    (weights.socialSentiment * socialSentiment) +
    (weights.galaxyScore * galaxyScoreSignal) +
    (weights.newsSentiment * newsSentiment) +
    (weights.communityVote * communityVote) +
    (weights.volumeIntensity * volumeIntensity)

  // ═══ 8. SAFEGUARDS ═══
  const priceChange24h = priceData ? Number(priceData.change24h) : (priceMultiframe?.change_24h || 0)
  const priceChange7d = priceMultiframe?.change_7d || (priceData ? Number(priceData.change7d) : 0)

  // Bullish Trap: prevent BULLISH if dropping > 5%
  let safeguardApplied = null
  if (score > 0.15 && priceChange24h < -5) {
    score = Math.min(score, 0.05)
    safeguardApplied = 'BULLISH_TRAP'
  }
  
  // Dead Cat Bounce: if down >15% in 7d but up >5% in 24h, cap at NEUTRAL
  if (score > 0.15 && priceChange7d < -15 && priceChange24h > 5) {
    score = Math.min(score, 0.05)
    safeguardApplied = 'DEAD_CAT_BOUNCE'
  }

  // Divergence detection: whale direction vs price direction
  const whaleDirection = Math.sign(whaleNetFlow)
  const priceDirection = Math.sign(priceChange24h)
  const divergence = hasWhaleData && total > 3 && whaleDirection !== 0 && priceDirection !== 0 && whaleDirection !== priceDirection

  // ═══ 9. LABEL DETERMINATION (6 levels) ═══
  let label, color
  if (score > 0.4) {
    label = 'STRONGLY BULLISH'; color = '#00e676'
  } else if (score > 0.15) {
    label = 'BULLISH'; color = '#00e676'
  } else if (score > 0.05) {
    label = 'SLIGHTLY BULLISH'; color = '#b2ff59'
  } else if (score > -0.05) {
    label = 'NEUTRAL'; color = '#ffab00'
  } else if (score > -0.15) {
    label = 'SLIGHTLY BEARISH'; color = '#ff8a65'
  } else if (score > -0.4) {
    label = 'BEARISH'; color = '#ff1744'
  } else {
    label = 'STRONGLY BEARISH'; color = '#ff1744'
  }

  // ═══ 10. CONFIDENCE (0-100) ═══
  const sourceCount = [hasWhaleData, !!priceData, newsCount > 0, hasLunarCrush, hasCoinGecko, hasMultiframe].filter(Boolean).length
  const maxSources = 6
  const dataConfidence = (sourceCount / maxSources) * 60 // up to 60 from data availability
  const signalAgreement = Math.abs(score) * 40            // up to 40 from signal strength
  const confidence = Math.min(100, Math.round(dataConfidence + signalAgreement))

  // Round components for output
  const roundedComponents = {}
  for (const [k, v] of Object.entries(components)) {
    roundedComponents[k] = Number(v.toFixed(3))
  }

  return {
    label,
    color,
    score: Number(score.toFixed(3)),
    confidence,
    divergence,
    safeguardApplied,
    components: roundedComponents,
    details: {
      buyPct: Number(buyPct.toFixed(1)),
      buys, sells,
      net: Math.round(net),
      buyVol: Math.round(buyVol),
      sellVol: Math.round(sellVol),
      last6Net: Math.round(last6Net),
      prev6Net: Math.round(prev6Net),
      priceChange24h: priceData?.change24h || priceMultiframe?.change_24h || null,
      priceChange7d: priceData?.change7d || priceMultiframe?.change_7d || null,
      newsCount,
      newsSentimentRaw: newsCount > 0 ? Number(newsSentiment.toFixed(2)) : null,
      galaxyScore: lunarcrush?.galaxy_score || null,
      altRank: lunarcrush?.alt_rank || null,
      socialSentimentPct: lunarcrush?.sentiment || null,
      communityVotePct: coingeckoSentiment?.votes_up_pct || null,
      sourcesUsed: sourceCount,
    }
  }
}

function computeMedian(values) {
  if (!values || values.length === 0) return 0
  const arr = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

/**
 * Simplified version for Orca API (just determines label from buyPct and netFlow)
 * Now uses the same thresholds as the enhanced algorithm
 */
export function calculateSimpleSentiment(buyPct, netFlow) {
  const total = 100
  const bias = (buyPct - 50) / 50
  const flowComponent = netFlow > 0 ? 0.3 : netFlow < 0 ? -0.3 : 0
  
  const score = (bias * 0.7) + flowComponent
  
  let label = 'NEUTRAL'
  if (score > 0.15) label = 'BULLISH'
  else if (score < -0.15) label = 'BEARISH'
  
  return { label, score: Number(score.toFixed(3)) }
}

