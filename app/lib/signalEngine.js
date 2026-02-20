/**
 * Sonar Unified Signal Engine v1.0
 * 
 * Produces a single actionable signal per token:
 *   STRONG BUY / BUY / NEUTRAL / SELL / STRONG SELL
 * 
 * Tiered signal architecture:
 *   Tier 1 (40%): CEX whale flow — exchange inflow/outflow only
 *   Tier 2 (30%): Price momentum + volume intensity
 *   Tier 3 (20%): News sentiment + social intelligence
 *   Tier 4 (10%): EOA activity + community votes + dev activity
 * 
 * Key design principle: ONLY trust CEX-classified transactions for
 * buy/sell direction. EOA-to-EOA transfers are treated as neutral
 * volume/activity indicators.
 */

// ─── TIER 1: CEX WHALE FLOW ──────────────────────────────────────────────

/**
 * Analyze whale-exchange interactions for directional signals.
 * This is the highest-reliability signal source.
 * 
 * @param {Array} transactions - whale_transactions rows for this token
 * @param {number} lookbackMs - time window in ms (default 24h)
 * @returns {{ score: number, confidence: number, factors: object }}
 */
export function computeTier1_CexWhaleFlow(transactions = [], lookbackMs = 24 * 60 * 60 * 1000) {
  const now = Date.now()
  const cutoff = now - lookbackMs
  const prevCutoff = now - 2 * lookbackMs // previous period for comparison

  // Split into CEX-only transactions
  const cexTxs = transactions.filter(tx => 
    tx.counterparty_type === 'CEX' && 
    ['BUY', 'SELL'].includes((tx.classification || '').toUpperCase()) &&
    new Date(tx.timestamp).getTime() >= cutoff
  )

  const prevCexTxs = transactions.filter(tx =>
    tx.counterparty_type === 'CEX' &&
    ['BUY', 'SELL'].includes((tx.classification || '').toUpperCase()) &&
    new Date(tx.timestamp).getTime() >= prevCutoff &&
    new Date(tx.timestamp).getTime() < cutoff
  )

  if (cexTxs.length === 0) {
    return { score: 0, confidence: 0, available: false, factors: {} }
  }

  // Core metrics
  let cexBuys = 0, cexSells = 0, cexBuyVol = 0, cexSellVol = 0
  const uniqueBuyAddrs = new Set(), uniqueSellAddrs = new Set()

  for (const tx of cexTxs) {
    const usd = Number(tx.usd_value || 0)
    const side = (tx.classification || '').toUpperCase()
    const whale = tx.whale_address || tx.from_address || ''

    if (side === 'BUY') {
      cexBuys++
      cexBuyVol += usd
      uniqueBuyAddrs.add(whale.toLowerCase())
    } else if (side === 'SELL') {
      cexSells++
      cexSellVol += usd
      uniqueSellAddrs.add(whale.toLowerCase())
    }
  }

  // Previous period for volume change
  let prevCexVol = 0
  for (const tx of prevCexTxs) {
    prevCexVol += Number(tx.usd_value || 0)
  }

  const totalCexVol = cexBuyVol + cexSellVol
  const netCexFlow = cexBuyVol - cexSellVol // positive = accumulation
  const totalCexTxs = cexBuys + cexSells
  const cexBuyRatio = totalCexTxs > 0 ? cexBuys / totalCexTxs : 0.5
  const uniqueWhales = new Set([...uniqueBuyAddrs, ...uniqueSellAddrs]).size
  const volumeChange = prevCexVol > 0 ? (totalCexVol - prevCexVol) / prevCexVol : 0

  // === Score Components ===

  // 1. Buy/sell ratio signal [-1, +1]
  //    0.5 = neutral, >0.5 = bullish, <0.5 = bearish
  const ratioSignal = (cexBuyRatio - 0.5) * 2 // maps [0,1] to [-1,+1]

  // 2. Net flow signal [-1, +1] using tanh for bounded output
  //    Normalize by total volume to make scale-invariant
  const flowSignal = totalCexVol > 0 ? Math.tanh(netCexFlow / (totalCexVol * 0.5)) : 0

  // 3. Volume surge signal [0, +1]
  //    Above-average CEX volume amplifies the signal
  const volumeSurge = Math.min(1, Math.max(0, volumeChange))

  // 4. Whale breadth signal [0, +1]
  //    More unique whales = more conviction
  const breadthSignal = Math.min(1, uniqueWhales / 10)

  // Composite: weight ratio and flow equally, boost by volume and breadth
  const rawScore = (ratioSignal * 0.5 + flowSignal * 0.5)
  const amplifier = 1 + volumeSurge * 0.3 + breadthSignal * 0.2
  const score = clamp(rawScore * amplifier * 100, -100, 100)

  // Confidence based on data quality
  const txCountConf = Math.min(1, totalCexTxs / 10) // need ~10 txs for full confidence
  const whaleCountConf = Math.min(1, uniqueWhales / 5) // need ~5 unique whales
  const confidence = Math.round((txCountConf * 0.6 + whaleCountConf * 0.4) * 100)

  return {
    score: Math.round(score),
    confidence,
    available: true,
    factors: {
      cexBuyRatio: +(cexBuyRatio * 100).toFixed(1),
      netCexFlow: Math.round(netCexFlow),
      cexBuys,
      cexSells,
      cexBuyVol: Math.round(cexBuyVol),
      cexSellVol: Math.round(cexSellVol),
      uniqueWhales,
      volumeChangeVsPrev: +(volumeChange * 100).toFixed(1),
    }
  }
}


// ─── TIER 2: PRICE MOMENTUM + VOLUME ──────────────────────────────────────

/**
 * Multi-timeframe price momentum and volume analysis.
 * 
 * @param {{ change_1h, change_6h, change_24h, change_7d, change_30d }} priceChanges
 * @param {{ volume_24h, avg_volume_7d, market_cap }} volumeData
 * @returns {{ score: number, confidence: number, factors: object }}
 */
export function computeTier2_PriceMomentum(priceChanges = {}, volumeData = {}) {
  const c1h = Number(priceChanges.change_1h) || 0
  const c6h = Number(priceChanges.change_6h) || 0
  const c24h = Number(priceChanges.change_24h) || 0
  const c7d = Number(priceChanges.change_7d) || 0
  const c30d = Number(priceChanges.change_30d) || 0

  const vol24h = Number(volumeData.volume_24h) || 0
  const avgVol7d = Number(volumeData.avg_volume_7d) || vol24h
  const mcap = Number(volumeData.market_cap) || 0

  const hasPrice = c1h !== 0 || c24h !== 0 || c7d !== 0
  if (!hasPrice && vol24h === 0) {
    return { score: 0, confidence: 0, available: false, factors: {} }
  }

  // Multi-timeframe momentum: weight shorter timeframes higher for signal timeliness
  // but use longer timeframes for trend confirmation
  const m1h = Math.tanh(c1h / 5) * 100    // ±5% move = strong signal
  const m6h = Math.tanh(c6h / 8) * 100
  const m24h = Math.tanh(c24h / 10) * 100
  const m7d = Math.tanh(c7d / 20) * 100
  const m30d = Math.tanh(c30d / 30) * 100

  // Weighted momentum: recent data matters more
  const momentumScore = m1h * 0.15 + m6h * 0.20 + m24h * 0.30 + m7d * 0.25 + m30d * 0.10

  // Volume intensity: is volume confirming the price move?
  const volRatio = avgVol7d > 0 ? vol24h / avgVol7d : 1
  const volSignal = Math.tanh((volRatio - 1) * 2) // >1 = above avg, boost
  const volMcapRatio = mcap > 0 ? vol24h / mcap : 0

  // Volume confirms direction: if momentum and volume agree, boost score
  const sameDirection = (momentumScore > 0 && volSignal > 0) || (momentumScore < 0 && volSignal < 0)
  const volConfirmation = sameDirection ? 1.2 : 0.85

  const score = clamp(momentumScore * volConfirmation, -100, 100)

  // Confidence: higher when we have multi-timeframe data
  const dataPoints = [c1h, c6h, c24h, c7d, c30d].filter(v => v !== 0).length
  const confidence = Math.round(Math.min(100, (dataPoints / 5) * 80 + (volRatio > 0 ? 20 : 0)))

  return {
    score: Math.round(score),
    confidence,
    available: true,
    factors: {
      change_1h: +c1h.toFixed(2),
      change_6h: +c6h.toFixed(2),
      change_24h: +c24h.toFixed(2),
      change_7d: +c7d.toFixed(2),
      change_30d: +c30d.toFixed(2),
      volumeRatio: +volRatio.toFixed(2),
      volumeMcapRatio: +volMcapRatio.toFixed(4),
      volumeConfirms: sameDirection,
    }
  }
}


// ─── TIER 3: NEWS SENTIMENT + SOCIAL INTELLIGENCE ─────────────────────────

/**
 * Aggregated sentiment from news + social sources.
 * 
 * @param {{ score: number, count: number }} sentimentData - from sentiment_scores table
 * @param {{ galaxy_score, alt_rank, sentiment, interactions_24h }} socialData - LunarCrush
 * @returns {{ score: number, confidence: number, factors: object }}
 */
export function computeTier3_SentimentSocial(sentimentData = null, socialData = null) {
  let sentimentScore = 0, sentimentConf = 0
  let socialScore = 0, socialConf = 0

  // News sentiment: score is 0.0-1.0, map to [-100, +100]
  if (sentimentData && sentimentData.score != null) {
    const raw = Number(sentimentData.score)
    const count = Number(sentimentData.count || 0)
    sentimentScore = (raw - 0.5) * 200 // 0.5 = neutral, map to [-100, +100]
    sentimentConf = Math.min(100, count * 10) // ~10 articles for full confidence
  }

  // Social intelligence
  if (socialData) {
    const galaxy = Number(socialData.galaxy_score || 0)
    const sentiment = Number(socialData.sentiment || 50)
    const interactions = Number(socialData.interactions_24h || 0)

    // Galaxy score: 0-100, 50 = neutral
    const galaxySignal = (galaxy - 50) * 2 // [-100, +100]

    // Social sentiment: already a percentage (0-100)
    const socialSentSignal = (sentiment - 50) * 2

    // Interactions surge: more activity = more weight to social signals
    const interactionWeight = Math.min(1, interactions / 100000)

    socialScore = (galaxySignal * 0.5 + socialSentSignal * 0.5) * (0.5 + interactionWeight * 0.5)
    socialConf = Math.round(Math.min(100, interactionWeight * 70 + (galaxy > 0 ? 30 : 0)))
  }

  const hasSentiment = sentimentData && sentimentData.score != null
  const hasSocial = socialData && socialData.galaxy_score

  if (!hasSentiment && !hasSocial) {
    return { score: 0, confidence: 0, available: false, factors: {} }
  }

  // Combine: if both available, weight sentiment 40% and social 60% (social is more real-time)
  let combined, combinedConf
  if (hasSentiment && hasSocial) {
    combined = sentimentScore * 0.4 + socialScore * 0.6
    combinedConf = Math.round(sentimentConf * 0.4 + socialConf * 0.6)
  } else if (hasSentiment) {
    combined = sentimentScore
    combinedConf = sentimentConf
  } else {
    combined = socialScore
    combinedConf = socialConf
  }

  return {
    score: Math.round(clamp(combined, -100, 100)),
    confidence: combinedConf,
    available: true,
    factors: {
      newsSentiment: hasSentiment ? +(sentimentData.score).toFixed(3) : null,
      newsArticleCount: sentimentData?.count || 0,
      galaxyScore: socialData?.galaxy_score || null,
      altRank: socialData?.alt_rank || null,
      socialSentiment: socialData?.sentiment || null,
      interactions24h: socialData?.interactions_24h || null,
    }
  }
}


// ─── TIER 4: EOA ACTIVITY + COMMUNITY + DEV ───────────────────────────────

/**
 * Weak/confirmation signals from EOA transfers, community votes, dev activity.
 * 
 * @param {Array} transactions - all whale_transactions (we extract EOA-only)
 * @param {{ bullish, bearish, neutral }} communityVotes
 * @param {{ commits, contributors }} devActivity
 * @returns {{ score: number, confidence: number, factors: object }}
 */
export function computeTier4_WeakSignals(transactions = [], communityVotes = null, devActivity = null) {
  const now = Date.now()
  const cutoff24h = now - 24 * 60 * 60 * 1000
  const prevCutoff = now - 48 * 60 * 60 * 1000

  // EOA-to-EOA: volume only (NOT direction)
  const eoaTxs = transactions.filter(tx =>
    tx.counterparty_type === 'EOA' &&
    new Date(tx.timestamp).getTime() >= cutoff24h
  )
  const prevEoaTxs = transactions.filter(tx =>
    tx.counterparty_type === 'EOA' &&
    new Date(tx.timestamp).getTime() >= prevCutoff &&
    new Date(tx.timestamp).getTime() < cutoff24h
  )

  let eoaVol = 0, prevEoaVol = 0
  for (const tx of eoaTxs) eoaVol += Number(tx.usd_value || 0)
  for (const tx of prevEoaTxs) prevEoaVol += Number(tx.usd_value || 0)

  // EOA volume change: surge in activity (not direction) is slightly bullish
  // because it indicates interest/attention
  const eoaVolChange = prevEoaVol > 0 ? (eoaVol - prevEoaVol) / prevEoaVol : 0
  const eoaActivitySignal = Math.tanh(eoaVolChange) * 30 // weak signal, capped

  // Community votes
  let voteSignal = 0, voteConf = 0
  if (communityVotes) {
    const b = Number(communityVotes.bullish || 0)
    const br = Number(communityVotes.bearish || 0)
    const n = Number(communityVotes.neutral || 0)
    const total = b + br + n
    if (total >= 3) { // minimum 3 votes for any signal
      voteSignal = ((b - br) / total) * 50 // weak, max ±50
      voteConf = Math.min(100, total * 5)
    }
  }

  // Developer activity: positive is a health signal but not directional
  let devSignal = 0
  if (devActivity) {
    const commits = Number(devActivity.commits || 0)
    if (commits > 100) devSignal = 15
    else if (commits > 50) devSignal = 10
    else if (commits > 10) devSignal = 5
  }

  const score = clamp(eoaActivitySignal + voteSignal + devSignal, -100, 100)
  const available = eoaTxs.length > 0 || communityVotes || devActivity

  return {
    score: Math.round(score),
    confidence: Math.round(Math.min(100, (eoaTxs.length > 0 ? 30 : 0) + voteConf * 0.4 + (devActivity ? 20 : 0))),
    available: !!available,
    factors: {
      eoaVolume24h: Math.round(eoaVol),
      eoaVolumeChange: +(eoaVolChange * 100).toFixed(1),
      eoaTxCount: eoaTxs.length,
      communityBullish: communityVotes?.bullish || 0,
      communityBearish: communityVotes?.bearish || 0,
      communityNeutral: communityVotes?.neutral || 0,
      devCommits: devActivity?.commits || 0,
    }
  }
}


// ─── TRAP DETECTION ───────────────────────────────────────────────────────

/**
 * Detect market traps that should override or reduce the signal.
 */
export function detectTraps(tier1, tier2, tier3, volumeData = {}) {
  const traps = []

  const vol24h = Number(volumeData.volume_24h) || 0
  const mcap = Number(volumeData.market_cap) || 1
  const volMcapRatio = vol24h / mcap

  // 1. Bullish Trap: Price up but whales distributing via CEX
  if (tier2.score > 20 && tier1.available && tier1.score < -20) {
    traps.push({
      type: 'BULLISH_TRAP',
      severity: 'HIGH',
      description: 'Price rising but whale CEX flow is net negative (distribution detected)',
      adjustment: -30, // reduce bullish score significantly
    })
  }

  // 2. Dead Cat Bounce: Short-term spike in sustained decline, no volume confirmation
  if (tier2.factors?.change_1h > 3 && tier2.factors?.change_7d < -15 && !tier2.factors?.volumeConfirms) {
    traps.push({
      type: 'DEAD_CAT_BOUNCE',
      severity: 'MEDIUM',
      description: 'Short-term price spike during sustained decline without volume confirmation',
      adjustment: -20,
    })
  }

  // 3. Social Pump Divergence: Social spiking but no whale CEX activity
  if (tier3.available && tier3.score > 40 && tier1.available && Math.abs(tier1.score) < 10) {
    traps.push({
      type: 'SOCIAL_PUMP_DIVERGENCE',
      severity: 'MEDIUM',
      description: 'Social metrics spiking without corresponding whale exchange activity',
      adjustment: -15,
    })
  }

  // 4. Bearish Trap: Price dropping but whales accumulating via CEX
  if (tier2.score < -20 && tier1.available && tier1.score > 20) {
    traps.push({
      type: 'BEARISH_TRAP',
      severity: 'HIGH',
      description: 'Price falling but whale CEX flow is net positive (accumulation detected)',
      adjustment: 20, // reduce bearish score (make less bearish)
    })
  }

  // 5. Low Liquidity Warning
  if (volMcapRatio < 0.02 && mcap > 0) {
    traps.push({
      type: 'LOW_LIQUIDITY',
      severity: 'LOW',
      description: `Volume/Mcap ratio is ${(volMcapRatio * 100).toFixed(2)}% — low liquidity`,
      confidenceReduction: 30,
    })
  }

  return traps
}


// ─── UNIFIED SIGNAL COMPUTATION ───────────────────────────────────────────

/**
 * Compute the final unified signal from all tiers.
 * 
 * @param {object} params - All data sources
 * @returns {object} Final signal with score, label, confidence, factors, traps
 */
export function computeUnifiedSignal({
  transactions = [],
  priceChanges = {},
  volumeData = {},
  sentimentData = null,
  socialData = null,
  communityVotes = null,
  devActivity = null,
  tokenSymbol = 'UNKNOWN',
}) {
  // Compute each tier
  const tier1 = computeTier1_CexWhaleFlow(transactions)
  const tier2 = computeTier2_PriceMomentum(priceChanges, volumeData)
  const tier3 = computeTier3_SentimentSocial(sentimentData, socialData)
  const tier4 = computeTier4_WeakSignals(transactions, communityVotes, devActivity)

  // Dynamic weight redistribution
  const baseWeights = { tier1: 0.40, tier2: 0.30, tier3: 0.20, tier4: 0.10 }
  const tiers = [
    { key: 'tier1', data: tier1, weight: baseWeights.tier1 },
    { key: 'tier2', data: tier2, weight: baseWeights.tier2 },
    { key: 'tier3', data: tier3, weight: baseWeights.tier3 },
    { key: 'tier4', data: tier4, weight: baseWeights.tier4 },
  ]

  // Redistribute weight from unavailable tiers
  const availableTiers = tiers.filter(t => t.data.available)
  const unavailableWeight = tiers.filter(t => !t.data.available).reduce((s, t) => s + t.weight, 0)

  if (availableTiers.length === 0) {
    return {
      signal: 'NEUTRAL',
      score: 50,
      confidence: 0,
      rawScore: 0,
      factors: [],
      traps: [],
      tiers: { tier1, tier2, tier3, tier4 },
      timestamp: new Date().toISOString(),
      token: tokenSymbol,
      timeframe: 'insufficient_data',
    }
  }

  const totalAvailableWeight = availableTiers.reduce((s, t) => s + t.weight, 0)
  for (const t of availableTiers) {
    t.effectiveWeight = t.weight + (unavailableWeight * (t.weight / totalAvailableWeight))
  }

  // Weighted composite score [-100, +100]
  let rawScore = 0
  for (const t of availableTiers) {
    rawScore += t.data.score * t.effectiveWeight
  }

  // Detect traps and apply adjustments
  const traps = detectTraps(tier1, tier2, tier3, volumeData)
  let trapAdjustment = 0
  let confidenceReduction = 0
  for (const trap of traps) {
    if (trap.adjustment) trapAdjustment += trap.adjustment
    if (trap.confidenceReduction) confidenceReduction += trap.confidenceReduction
  }
  rawScore = clamp(rawScore + trapAdjustment, -100, 100)

  // Confluence confidence: boost when tiers agree, penalize divergence
  const directions = availableTiers.map(t => Math.sign(t.data.score))
  const agreementCount = directions.filter(d => d === Math.sign(rawScore)).length
  const confluenceMultiplier = 0.6 + (agreementCount / availableTiers.length) * 0.4

  // Weighted confidence
  let baseConfidence = 0
  for (const t of availableTiers) {
    baseConfidence += t.data.confidence * t.effectiveWeight
  }
  const confidence = Math.round(
    Math.min(100, Math.max(0, baseConfidence * confluenceMultiplier - confidenceReduction))
  )

  // Map [-100, +100] to [0, 100] score (50 = neutral)
  const score = Math.round(clamp((rawScore + 100) / 2, 0, 100))

  // Signal label
  const signal = getSignalLabel(score, confidence)

  // Top contributing factors
  const factors = []
  for (const t of availableTiers) {
    const tierName = {
      tier1: 'CEX Whale Flow',
      tier2: 'Price Momentum',
      tier3: 'Sentiment & Social',
      tier4: 'Activity & Community',
    }[t.key]
    factors.push({
      name: tierName,
      score: t.data.score,
      weight: +(t.effectiveWeight * 100).toFixed(0),
      contribution: Math.round(t.data.score * t.effectiveWeight),
    })
  }
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  // Determine recommended timeframe
  const timeframe = determineTimeframe(tier1, tier2)

  return {
    signal,
    score,
    confidence,
    rawScore: Math.round(rawScore),
    factors: factors.slice(0, 3),
    traps,
    tiers: { tier1, tier2, tier3, tier4 },
    timestamp: new Date().toISOString(),
    token: tokenSymbol,
    timeframe,
  }
}


// ─── HELPERS ──────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function getSignalLabel(score, confidence) {
  // With very low confidence, bias toward NEUTRAL
  if (confidence < 15) return 'NEUTRAL'

  if (score >= 75) return 'STRONG BUY'
  if (score >= 60) return 'BUY'
  if (score > 40 && score < 60) return 'NEUTRAL'
  if (score <= 25) return 'STRONG SELL'
  if (score <= 40) return 'SELL'
  return 'NEUTRAL'
}

function determineTimeframe(tier1, tier2) {
  // If whale flow is strong, signals tend to be medium-term (3-7d)
  if (tier1.available && Math.abs(tier1.score) > 50) return '3d-7d'
  // If price momentum is dominant, signals are shorter-term
  if (tier2.available && Math.abs(tier2.score) > 50) return '24h-3d'
  return '24h-7d'
}

export function getSignalColor(signal) {
  switch (signal) {
    case 'STRONG BUY': return '#00e676'
    case 'BUY': return '#66bb6a'
    case 'NEUTRAL': return '#ffab00'
    case 'SELL': return '#ef5350'
    case 'STRONG SELL': return '#ff1744'
    default: return '#ffab00'
  }
}
