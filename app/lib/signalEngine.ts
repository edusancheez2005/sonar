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
 */

// ─── TYPES ────────────────────────────────────────────────────────────────

export type SignalLabel = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'

export interface WhaleTransaction {
  transaction_hash?: string
  timestamp: string
  blockchain?: string
  token_symbol?: string
  classification?: string
  usd_value?: number | string
  whale_score?: number
  whale_address?: string
  from_address?: string
  counterparty_type?: string
}

export interface TierResult {
  score: number
  confidence: number
  available: boolean
  factors: Record<string, unknown>
}

export interface PriceChanges {
  change_1h?: number | string
  change_6h?: number | string
  change_24h?: number | string
  change_7d?: number | string
  change_30d?: number | string
}

export interface VolumeData {
  volume_24h?: number | string
  avg_volume_7d?: number | string
  market_cap?: number | string
}

export interface SentimentData {
  score: number
  count?: number
}

export interface SocialData {
  galaxy_score?: number
  alt_rank?: number
  sentiment?: number
  interactions_24h?: number
}

export interface CommunityVotes {
  bullish?: number
  bearish?: number
  neutral?: number
}

export interface DevActivity {
  commits?: number
  contributors?: number
}

export interface Trap {
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  adjustment?: number
  confidenceReduction?: number
}

export interface SignalFactor {
  name: string
  score: number
  weight: number
  contribution: number
}

export interface UnifiedSignal {
  signal: SignalLabel
  score: number
  confidence: number
  rawScore: number
  factors: SignalFactor[]
  traps: Trap[]
  tiers: {
    tier1: TierResult
    tier2: TierResult
    tier3: TierResult
    tier4: TierResult
  }
  timestamp: string
  token: string
  timeframe: string
}

export interface ComputeSignalParams {
  transactions?: WhaleTransaction[]
  priceChanges?: PriceChanges
  volumeData?: VolumeData
  sentimentData?: SentimentData | null
  socialData?: SocialData | null
  communityVotes?: CommunityVotes | null
  devActivity?: DevActivity | null
  tokenSymbol?: string
}

// ─── TIER 1: CEX WHALE FLOW ──────────────────────────────────────────────

export function computeTier1_CexWhaleFlow(
  transactions: WhaleTransaction[] = [],
  lookbackMs: number = 24 * 60 * 60 * 1000
): TierResult {
  const now = Date.now()
  const cutoff = now - lookbackMs
  const prevCutoff = now - 2 * lookbackMs

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

  let cexBuyVol = 0, cexSellVol = 0, cexBuyVolWeighted = 0, cexSellVolWeighted = 0
  let cexBuys = 0, cexSells = 0
  const uniqueBuyAddrs = new Set<string>()
  const uniqueSellAddrs = new Set<string>()
  let largeTxBuyVol = 0, largeTxSellVol = 0 // Txs > $500K

  // Track velocity: transactions in last 3 hours vs rest
  const recentCutoff = now - 3 * 60 * 60 * 1000
  let recentBuyVol = 0, recentSellVol = 0

  for (const tx of cexTxs) {
    const usd = Number(tx.usd_value || 0)
    const side = (tx.classification || '').toUpperCase()
    const whale = tx.whale_address || tx.from_address || ''
    const txTime = new Date(tx.timestamp).getTime()

    // Exponential time-decay: recent txs matter more (half-life = 6 hours)
    const ageMs = now - txTime
    const decay = Math.exp(-ageMs / (6 * 60 * 60 * 1000))

    // Size emphasis: sqrt scaling so large txs matter more but don't dominate
    const sizeWeight = Math.sqrt(Math.max(1, usd / 10000))

    const weighted = usd * decay * sizeWeight

    if (side === 'BUY') {
      cexBuys++
      cexBuyVol += usd
      cexBuyVolWeighted += weighted
      uniqueBuyAddrs.add(whale.toLowerCase())
      if (usd > 500000) largeTxBuyVol += usd
      if (txTime >= recentCutoff) recentBuyVol += usd
    } else if (side === 'SELL') {
      cexSells++
      cexSellVol += usd
      cexSellVolWeighted += weighted
      uniqueSellAddrs.add(whale.toLowerCase())
      if (usd > 500000) largeTxSellVol += usd
      if (txTime >= recentCutoff) recentSellVol += usd
    }
  }

  let prevCexVol = 0
  for (const tx of prevCexTxs) {
    prevCexVol += Number(tx.usd_value || 0)
  }

  const totalCexVol = cexBuyVol + cexSellVol
  const totalWeighted = cexBuyVolWeighted + cexSellVolWeighted
  const netCexFlow = cexBuyVol - cexSellVol
  const totalCexTxs = cexBuys + cexSells
  const cexBuyRatio = totalCexTxs > 0 ? cexBuys / totalCexTxs : 0.5
  const uniqueWhales = new Set([...uniqueBuyAddrs, ...uniqueSellAddrs]).size
  const volumeChange = prevCexVol > 0 ? (totalCexVol - prevCexVol) / prevCexVol : 0

  // Primary signal: time-decay + size-weighted flow (better than raw ratio)
  const weightedFlowSignal = totalWeighted > 0
    ? Math.tanh((cexBuyVolWeighted - cexSellVolWeighted) / (totalWeighted * 0.4))
    : 0

  // Large transaction signal (institutional conviction)
  const largeTxNet = largeTxBuyVol - largeTxSellVol
  const largeTxSignal = totalCexVol > 0
    ? Math.tanh(largeTxNet / (totalCexVol * 0.3)) * 0.5
    : 0

  // Velocity signal: are whales accelerating activity in last 3h?
  const recentNet = recentBuyVol - recentSellVol
  const olderBuyVol = cexBuyVol - recentBuyVol
  const olderSellVol = cexSellVol - recentSellVol
  const olderNet = olderBuyVol - olderSellVol
  const velocitySignal = (totalCexVol > 0 && (olderBuyVol + olderSellVol) > 0)
    ? Math.tanh((recentNet - olderNet * (3 / (lookbackMs / (60*60*1000) - 3))) / (totalCexVol * 0.2)) * 0.3
    : 0

  // Breadth (more unique whales = higher conviction)
  const breadthSignal = Math.min(1, uniqueWhales / 10) * 0.2
  const volumeSurge = Math.min(1, Math.max(0, volumeChange)) * 0.3

  const rawScore = weightedFlowSignal * 0.55 + largeTxSignal * 0.20 + velocitySignal * 0.15 + breadthSignal * Math.sign(weightedFlowSignal) + volumeSurge * Math.sign(weightedFlowSignal)
  const score = clamp(rawScore * 100, -100, 100)

  const txCountConf = Math.min(1, totalCexTxs / 10)
  const whaleCountConf = Math.min(1, uniqueWhales / 5)
  const largeTxConf = (largeTxBuyVol + largeTxSellVol) > 0 ? 0.2 : 0
  const confidence = Math.round((txCountConf * 0.5 + whaleCountConf * 0.3 + largeTxConf) * 100)

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
      largeTxBuyVol: Math.round(largeTxBuyVol),
      largeTxSellVol: Math.round(largeTxSellVol),
      recentBuyVol3h: Math.round(recentBuyVol),
      recentSellVol3h: Math.round(recentSellVol),
      weightedFlowSignal: +weightedFlowSignal.toFixed(3),
      velocitySignal: +velocitySignal.toFixed(3),
    }
  }
}


// ─── TIER 2: PRICE MOMENTUM + VOLUME ──────────────────────────────────────

export function computeTier2_PriceMomentum(
  priceChanges: PriceChanges = {},
  volumeData: VolumeData = {}
): TierResult {
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

  const m1h = Math.tanh(c1h / 5) * 100
  const m6h = Math.tanh(c6h / 8) * 100
  const m24h = Math.tanh(c24h / 10) * 100
  const m7d = Math.tanh(c7d / 20) * 100
  const m30d = Math.tanh(c30d / 30) * 100

  const momentumScore = m1h * 0.15 + m6h * 0.20 + m24h * 0.30 + m7d * 0.25 + m30d * 0.10

  const volRatio = avgVol7d > 0 ? vol24h / avgVol7d : 1
  const volSignal = Math.tanh((volRatio - 1) * 2)
  const volMcapRatio = mcap > 0 ? vol24h / mcap : 0

  const sameDirection = (momentumScore > 0 && volSignal > 0) || (momentumScore < 0 && volSignal < 0)
  const volConfirmation = sameDirection ? 1.2 : 0.85

  const score = clamp(momentumScore * volConfirmation, -100, 100)

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

export function computeTier3_SentimentSocial(
  sentimentData: SentimentData | null = null,
  socialData: SocialData | null = null
): TierResult {
  let sentimentScore = 0, sentimentConf = 0
  let socialScore = 0, socialConf = 0

  if (sentimentData && sentimentData.score != null) {
    const raw = Number(sentimentData.score)
    const count = Number(sentimentData.count || 0)
    sentimentScore = (raw - 0.5) * 200
    sentimentConf = Math.min(100, count * 10)
  }

  if (socialData) {
    const galaxy = Number(socialData.galaxy_score || 0)
    const sentiment = Number(socialData.sentiment || 50)
    const interactions = Number(socialData.interactions_24h || 0)

    const galaxySignal = (galaxy - 50) * 2
    const socialSentSignal = (sentiment - 50) * 2
    const interactionWeight = Math.min(1, interactions / 100000)

    socialScore = (galaxySignal * 0.5 + socialSentSignal * 0.5) * (0.5 + interactionWeight * 0.5)
    socialConf = Math.round(Math.min(100, interactionWeight * 70 + (galaxy > 0 ? 30 : 0)))
  }

  const hasSentiment = sentimentData != null && sentimentData.score != null
  const hasSocial = socialData != null && !!socialData.galaxy_score

  if (!hasSentiment && !hasSocial) {
    return { score: 0, confidence: 0, available: false, factors: {} }
  }

  let combined: number, combinedConf: number
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
      newsSentiment: hasSentiment ? +sentimentData!.score.toFixed(3) : null,
      newsArticleCount: sentimentData?.count || 0,
      galaxyScore: socialData?.galaxy_score || null,
      altRank: socialData?.alt_rank || null,
      socialSentiment: socialData?.sentiment || null,
      interactions24h: socialData?.interactions_24h || null,
    }
  }
}


// ─── TIER 4: EOA ACTIVITY + COMMUNITY + DEV ───────────────────────────────

export function computeTier4_WeakSignals(
  transactions: WhaleTransaction[] = [],
  communityVotes: CommunityVotes | null = null,
  devActivity: DevActivity | null = null
): TierResult {
  const now = Date.now()
  const cutoff24h = now - 24 * 60 * 60 * 1000
  const prevCutoff = now - 48 * 60 * 60 * 1000

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

  const eoaVolChange = prevEoaVol > 0 ? (eoaVol - prevEoaVol) / prevEoaVol : 0
  const eoaActivitySignal = Math.tanh(eoaVolChange) * 30

  let voteSignal = 0, voteConf = 0
  if (communityVotes) {
    const b = Number(communityVotes.bullish || 0)
    const br = Number(communityVotes.bearish || 0)
    const n = Number(communityVotes.neutral || 0)
    const total = b + br + n
    if (total >= 3) {
      voteSignal = ((b - br) / total) * 50
      voteConf = Math.min(100, total * 5)
    }
  }

  let devSignal = 0
  if (devActivity) {
    const commits = Number(devActivity.commits || 0)
    if (commits > 100) devSignal = 15
    else if (commits > 50) devSignal = 10
    else if (commits > 10) devSignal = 5
  }

  const score = clamp(eoaActivitySignal + voteSignal + devSignal, -100, 100)
  const available = eoaTxs.length > 0 || communityVotes != null || devActivity != null

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

export function detectTraps(
  tier1: TierResult,
  tier2: TierResult,
  tier3: TierResult,
  volumeData: VolumeData = {}
): Trap[] {
  const traps: Trap[] = []

  const vol24h = Number(volumeData.volume_24h) || 0
  const mcap = Number(volumeData.market_cap) || 1
  const volMcapRatio = vol24h / mcap

  if (tier2.score > 20 && tier1.available && tier1.score < -20) {
    traps.push({
      type: 'BULLISH_TRAP',
      severity: 'HIGH',
      description: 'Price rising but whale CEX flow is net negative (distribution detected)',
      adjustment: -30,
    })
  }

  const t2factors = tier2.factors as Record<string, unknown>
  if (
    Number(t2factors.change_1h || 0) > 3 &&
    Number(t2factors.change_7d || 0) < -15 &&
    !t2factors.volumeConfirms
  ) {
    traps.push({
      type: 'DEAD_CAT_BOUNCE',
      severity: 'MEDIUM',
      description: 'Short-term price spike during sustained decline without volume confirmation',
      adjustment: -20,
    })
  }

  if (tier3.available && tier3.score > 40 && tier1.available && Math.abs(tier1.score) < 10) {
    traps.push({
      type: 'SOCIAL_PUMP_DIVERGENCE',
      severity: 'MEDIUM',
      description: 'Social metrics spiking without corresponding whale exchange activity',
      adjustment: -15,
    })
  }

  if (tier2.score < -20 && tier1.available && tier1.score > 20) {
    traps.push({
      type: 'BEARISH_TRAP',
      severity: 'HIGH',
      description: 'Price falling but whale CEX flow is net positive (accumulation detected)',
      adjustment: 20,
    })
  }

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

export function computeUnifiedSignal({
  transactions = [],
  priceChanges = {},
  volumeData = {},
  sentimentData = null,
  socialData = null,
  communityVotes = null,
  devActivity = null,
  tokenSymbol = 'UNKNOWN',
}: ComputeSignalParams): UnifiedSignal {
  const tier1 = computeTier1_CexWhaleFlow(transactions)
  const tier2 = computeTier2_PriceMomentum(priceChanges, volumeData)
  const tier3 = computeTier3_SentimentSocial(sentimentData, socialData)
  const tier4 = computeTier4_WeakSignals(transactions, communityVotes, devActivity)

  const baseWeights = { tier1: 0.40, tier2: 0.30, tier3: 0.20, tier4: 0.10 }
  const tiers = [
    { key: 'tier1' as const, data: tier1, weight: baseWeights.tier1, effectiveWeight: 0 },
    { key: 'tier2' as const, data: tier2, weight: baseWeights.tier2, effectiveWeight: 0 },
    { key: 'tier3' as const, data: tier3, weight: baseWeights.tier3, effectiveWeight: 0 },
    { key: 'tier4' as const, data: tier4, weight: baseWeights.tier4, effectiveWeight: 0 },
  ]

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

  let rawScore = 0
  for (const t of availableTiers) {
    rawScore += t.data.score * t.effectiveWeight
  }

  const traps = detectTraps(tier1, tier2, tier3, volumeData)
  let trapAdjustment = 0
  let confidenceReduction = 0
  for (const trap of traps) {
    if (trap.adjustment) trapAdjustment += trap.adjustment
    if (trap.confidenceReduction) confidenceReduction += trap.confidenceReduction
  }

  // Smart Money Divergence Bonus:
  // When whale flow (Tier 1) strongly disagrees with price momentum (Tier 2),
  // the whale signal is historically MORE predictive (mean reversion).
  // Whales buying during dips = accumulation. Whales selling during pumps = distribution.
  // Boost the whale signal in these scenarios instead of canceling out.
  let smartMoneyBonus = 0
  if (tier1.available && tier2.available && tier1.confidence >= 40) {
    const whaleDirection = Math.sign(tier1.score)
    const priceDirection = Math.sign(tier2.score)
    if (whaleDirection !== 0 && whaleDirection !== priceDirection) {
      // Whale is going against price — this is the contrarian smart money signal
      const divergenceStrength = Math.min(Math.abs(tier1.score), Math.abs(tier2.score)) / 100
      smartMoneyBonus = whaleDirection * divergenceStrength * 25 // Up to ±25 bonus
    }
  }

  rawScore = clamp(rawScore + trapAdjustment + smartMoneyBonus, -100, 100)

  const directions = availableTiers.map(t => Math.sign(t.data.score))
  const agreementCount = directions.filter(d => d === Math.sign(rawScore)).length
  const confluenceMultiplier = 0.6 + (agreementCount / availableTiers.length) * 0.4

  let baseConfidence = 0
  for (const t of availableTiers) {
    baseConfidence += t.data.confidence * t.effectiveWeight
  }
  const confidence = Math.round(
    Math.min(100, Math.max(0, baseConfidence * confluenceMultiplier - confidenceReduction))
  )

  const score = Math.round(clamp((rawScore + 100) / 2, 0, 100))
  const signal = getSignalLabel(score, confidence)

  const tierNames: Record<string, string> = {
    tier1: 'CEX Whale Flow',
    tier2: 'Price Momentum',
    tier3: 'Sentiment & Social',
    tier4: 'Activity & Community',
  }

  const factors: SignalFactor[] = []
  for (const t of availableTiers) {
    factors.push({
      name: tierNames[t.key],
      score: t.data.score,
      weight: +(t.effectiveWeight * 100).toFixed(0),
      contribution: Math.round(t.data.score * t.effectiveWeight),
    })
  }
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function getSignalLabel(score: number, confidence: number): SignalLabel {
  if (confidence < 15) return 'NEUTRAL'
  if (score >= 75) return 'STRONG BUY'
  if (score >= 60) return 'BUY'
  if (score > 40 && score < 60) return 'NEUTRAL'
  if (score <= 25) return 'STRONG SELL'
  if (score <= 40) return 'SELL'
  return 'NEUTRAL'
}

function determineTimeframe(tier1: TierResult, tier2: TierResult): string {
  if (tier1.available && Math.abs(tier1.score) > 50) return '3d-7d'
  if (tier2.available && Math.abs(tier2.score) > 50) return '24h-3d'
  return '24h-7d'
}

export function getSignalColor(signal: SignalLabel): string {
  switch (signal) {
    case 'STRONG BUY': return '#00e676'
    case 'BUY': return '#66bb6a'
    case 'NEUTRAL': return '#ffab00'
    case 'SELL': return '#ef5350'
    case 'STRONG SELL': return '#ff1744'
    default: return '#ffab00'
  }
}
