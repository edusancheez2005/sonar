/**
 * Sonar Unified Signal Engine v7.0
 *
 * Produces a single actionable signal per token:
 *   STRONG BUY / BUY / NEUTRAL / SELL / STRONG SELL
 *
 * Tiered signal architecture:
 *   WITH derivatives (v5+):
 *     Tier 1 (20%): CEX whale flow
 *     Tier 2 (30%): Price momentum + volume + technical analysis
 *     Tier 3 (15%): News sentiment + social intelligence
 *     Tier 4 (5%):  EOA activity + community votes + dev activity
 *     Derivatives (30%): Funding rates, L/S ratios, top traders, taker volume
 *
 *   WITHOUT derivatives:
 *     Tier 1 (25%): CEX whale flow
 *     Tier 2 (40%): Price momentum + volume + technical analysis
 *     Tier 3 (25%): News sentiment + social intelligence
 *     Tier 4 (10%): EOA activity + community votes + dev activity
 *
 * v7 changes:
 *   - Live Binance price for price_at_signal (fixes stale price bug)
 *   - 6h/30d momentum computed from price snapshots (was hardcoded to 0)
 *   - Taker buy pressure from Binance klines (replaces binary volume multiplier)
 *   - Rolling Window Ticker for 1h/6h changes directly from Binance
 *   - PEPE/SHIB re-enabled for derivatives (NO_FUTURES fix)
 *   - Market beta thresholds synced with getSignalLabel() (58/72/42/28)
 *   - evaluate-signals STRONG BUY format fixed (was STRONG_BUY)
 *   - Factors expanded to top 5 (was 3)
 *   - Duplicate accuracy route resolved
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
  technicalSignals?: {
    compositeScore: number
    compositeConfidence: number
    rsi14: number | null
    rsiSignal: number
    smaSignal: number
    bbSignal: number
    regime: string
    regimeConfidence: number
  } | null
  derivativesData?: {
    fundingRate: number
    fundingSignal: number
    longShortRatio: number
    longShortSignal: number
    topTraderSignal: number
    compositeSignal: number
    openInterestUsd: number
    available: boolean
  } | null
  /**
   * Per-token rolling calibration loaded from the
   * `token_signal_calibration` table by the cron caller. When provided, it
   * overrides the static TIER1_SIGN_BY_TOKEN map below AND gates label
   * emission: tokens whose own historical IC is statistically thin will
   * stay NEUTRAL even if the score crosses 58/42.
   *
   * Shape: {
   *   signMultiplier: -1 | 0 | 1 | null   // null => use static fallback
   *   confidenceScore: number              // 0..100, used as label gate
   *   ic: number | null
   *   nOutcomes: number
   * }
   *
   * If undefined, the engine behaves exactly as before (static map only).
   * This keeps the engine importable from places that don't have DB access
   * (e.g. unit tests, the on-demand single-token UI endpoint).
   */
  calibration?: {
    signMultiplier: -1 | 0 | 1 | null
    confidenceScore: number
    ic: number | null
    nOutcomes: number
  } | null
}

// ─── TIER 1: CEX WHALE FLOW ──────────────────────────────────────────────

export function computeTier1_CexWhaleFlow(
  transactions: WhaleTransaction[] = [],
  lookbackMs: number = 24 * 60 * 60 * 1000
): TierResult {
  const now = Date.now()
  const cutoff = now - lookbackMs
  const prevCutoff = now - 2 * lookbackMs

  // Use ALL BUY/SELL whale transactions (not just CEX) — matches dashboard data
  const allTxs = transactions.filter(tx =>
    ['BUY', 'SELL'].includes((tx.classification || '').toUpperCase()) &&
    new Date(tx.timestamp).getTime() >= cutoff
  )

  const prevTxs = transactions.filter(tx =>
    ['BUY', 'SELL'].includes((tx.classification || '').toUpperCase()) &&
    new Date(tx.timestamp).getTime() >= prevCutoff &&
    new Date(tx.timestamp).getTime() < cutoff
  )

  if (allTxs.length === 0) {
    return { score: 0, confidence: 0, available: false, factors: {} }
  }

  let buyVol = 0, sellVol = 0, buyVolWeighted = 0, sellVolWeighted = 0
  let buys = 0, sells = 0
  let cexBuyVol = 0, cexSellVol = 0 // CEX sub-signal (higher conviction)
  const uniqueBuyAddrs = new Set<string>()
  const uniqueSellAddrs = new Set<string>()
  let largeTxBuyVol = 0, largeTxSellVol = 0

  const recentCutoff = now - 3 * 60 * 60 * 1000
  let recentBuyVol = 0, recentSellVol = 0

  for (const tx of allTxs) {
    const usd = Number(tx.usd_value || 0)
    const side = (tx.classification || '').toUpperCase()
    const whale = tx.whale_address || tx.from_address || ''
    const txTime = new Date(tx.timestamp).getTime()
    const isCex = tx.counterparty_type === 'CEX'

    // Exponential time-decay (half-life = 6h)
    const decay = Math.exp(-(now - txTime) / (6 * 60 * 60 * 1000))
    // Size emphasis (sqrt scaling)
    const sizeWeight = Math.sqrt(Math.max(1, usd / 10000))
    // CEX transactions get 1.5x weight (higher conviction than EOA transfers)
    const cexBoost = isCex ? 1.5 : 1.0

    const weighted = usd * decay * sizeWeight * cexBoost

    if (side === 'BUY') {
      buys++
      buyVol += usd
      buyVolWeighted += weighted
      uniqueBuyAddrs.add(whale.toLowerCase())
      if (usd > 500000) largeTxBuyVol += usd
      if (txTime >= recentCutoff) recentBuyVol += usd
      if (isCex) cexBuyVol += usd
    } else if (side === 'SELL') {
      sells++
      sellVol += usd
      sellVolWeighted += weighted
      uniqueSellAddrs.add(whale.toLowerCase())
      if (usd > 500000) largeTxSellVol += usd
      if (txTime >= recentCutoff) recentSellVol += usd
      if (isCex) cexSellVol += usd
    }
  }

  let prevVol = 0
  for (const tx of prevTxs) prevVol += Number(tx.usd_value || 0)

  const totalVol = buyVol + sellVol
  const totalWeighted = buyVolWeighted + sellVolWeighted
  const netFlow = buyVol - sellVol
  const totalTxs = buys + sells
  const buyRatio = totalTxs > 0 ? buys / totalTxs : 0.5
  const uniqueWhales = new Set([...uniqueBuyAddrs, ...uniqueSellAddrs]).size
  const volumeChange = prevVol > 0 ? (totalVol - prevVol) / prevVol : 0

  // Primary: time-decay + size-weighted + CEX-boosted flow
  const weightedFlowSignal = totalWeighted > 0
    ? Math.tanh((buyVolWeighted - sellVolWeighted) / (totalWeighted * 0.4))
    : 0

  // Large transaction signal (institutional conviction)
  const largeTxNet = largeTxBuyVol - largeTxSellVol
  const largeTxSignal = totalVol > 0
    ? Math.tanh(largeTxNet / (totalVol * 0.3)) * 0.5
    : 0

  // Velocity: are whales accelerating in last 3h?
  const recentNet = recentBuyVol - recentSellVol
  const olderBuyVol = buyVol - recentBuyVol
  const olderSellVol = sellVol - recentSellVol
  const olderNet = olderBuyVol - olderSellVol
  const lookbackHours = lookbackMs / (60 * 60 * 1000)
  const velocitySignal = (totalVol > 0 && (olderBuyVol + olderSellVol) > 0)
    ? Math.tanh((recentNet - olderNet * (3 / Math.max(1, lookbackHours - 3))) / (totalVol * 0.2)) * 0.3
    : 0

  // Breadth + surge — DIRECTIONALLY NEUTRAL (v3 fix)
  // These should NOT always add in the buy direction
  // Instead, they increase confidence but don't move the score
  const breadthBonus = Math.min(1, uniqueWhales / 10) * 0.15
  const surgeBonus = Math.min(1, Math.max(0, volumeChange)) * 0.2

  // v3: breadth and surge amplify the existing signal, not push it further bullish
  const directionMultiplier = 1 + breadthBonus + surgeBonus
  const rawScore = (weightedFlowSignal * 0.55 + largeTxSignal * 0.20 + velocitySignal * 0.15) * directionMultiplier
  const score = clamp(rawScore * 100, -100, 100)

  const txCountConf = Math.min(1, totalTxs / 10)
  const whaleCountConf = Math.min(1, uniqueWhales / 5)
  const largeTxConf = (largeTxBuyVol + largeTxSellVol) > 0 ? 0.2 : 0
  const confidence = Math.round((txCountConf * 0.5 + whaleCountConf * 0.3 + largeTxConf) * 100)

  return {
    score: Math.round(score),
    confidence,
    available: true,
    factors: {
      buyRatio: +(buyRatio * 100).toFixed(1),
      netFlow: Math.round(netFlow),
      buys,
      sells,
      buyVol: Math.round(buyVol),
      sellVol: Math.round(sellVol),
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
  technicalSignals = null,
  derivativesData = null,
  calibration = null,
}: ComputeSignalParams): UnifiedSignal {
  const tier1Raw = computeTier1_CexWhaleFlow(transactions)
  const tier2Raw = computeTier2_PriceMomentum(priceChanges, volumeData)
  const tier3 = computeTier3_SentimentSocial(sentimentData, socialData)
  const tier4 = computeTier4_WeakSignals(transactions, communityVotes, devActivity)

  // ─── Per-token Tier 1 sign calibration ──────────────────────────────────
  // PRIMARY source: live `token_signal_calibration` table, refreshed daily
  // by /api/cron/calibrate-signals. Passed in as `calibration` param by the
  // compute-signals cron. The cron derives `signMultiplier` from the
  // 30-day rolling hit_rate per token.
  //
  // FALLBACK source: the static map below. This is a safety net for:
  //   (a) brand-new tokens with no outcome history yet,
  //   (b) the on-demand single-token UI endpoint that doesn't load
  //       calibration,
  //   (c) the moments after a fresh deploy if calibration hasn't run.
  //
  // The static values are an audit snapshot (last refresh: 2026-04-25)
  // computed by the same hit-rate-first rule the cron uses. Anything not
  // in this map defaults to +1 (keep direction). The cron will silently
  // override every entry within 24h of running.
  //
  // FLIP LIST (hit_rate ≤ 0.40 on 30d, n ≥ 50):
  //   AAVE, AXS, BAT, BTC, CHZ, CRV, DOGE, ETH, LINK, ONDO, PEPE,
  //   SHIB, SNX, SOL, UNI, WBTC
  // KEEP LIST (hit_rate ≥ 0.60, n ≥ 50, default +1):
  //   ARB, BLUR, COMP, ENA, FLOKI, GRT, IMX, LDO, MANA, PENDLE,
  //   RNDR, SUSHI, WETH, WLD, YFI, INJ, MNT, ENS
  // MUTE (0.40 < hit_rate < 0.60, n ≥ 50):
  //   SAND, ZRX
  // SIGNAL_ENGINE_IC_FIX=off forces every multiplier back to +1 (kill switch).
  const TIER1_SIGN_BY_TOKEN: Record<string, -1 | 0 | 1> = {
    AAVE: -1, AXS: -1, BAT: -1, BTC: -1, CHZ: -1, CRV: -1, DOGE: -1,
    ETH: -1, LINK: -1, ONDO: -1, PEPE: -1, SHIB: -1, SNX: -1, SOL: -1,
    UNI: -1, WBTC: -1,
    SAND: 0, ZRX: 0,
    // (KEEP list omitted: default fallback is already +1)
  }
  const IC_FIX_ENABLED = process.env.SIGNAL_ENGINE_IC_FIX !== 'off'
  const tokenKey = (tokenSymbol || '').toUpperCase()

  // Resolution order for tier1Sign:
  //   1. Live calibration row from DB (if provided AND has a non-null sign)
  //   2. Static TIER1_SIGN_BY_TOKEN map (the 2026-04-22 baked-in audit)
  //   3. Default +1 (keep raw direction)
  // SIGNAL_ENGINE_IC_FIX=off forces every multiplier to +1 (full kill switch).
  const calibratedSign: -1 | 0 | 1 | null =
    (calibration && calibration.signMultiplier !== null)
      ? calibration.signMultiplier
      : null
  const tier1Sign: -1 | 0 | 1 = IC_FIX_ENABLED
    ? (calibratedSign ?? TIER1_SIGN_BY_TOKEN[tokenKey] ?? 1)
    : 1
  const tier1 = tier1Sign === 1
    ? tier1Raw
    : {
        ...tier1Raw,
        score: tier1Sign === 0 ? 0 : -tier1Raw.score,
        confidence: tier1Sign === 0 ? 0 : tier1Raw.confidence,
        available: tier1Sign === 0 ? false : tier1Raw.available,
        factors: { ...tier1Raw.factors, tier1_sign_multiplier: tier1Sign },
      }

  // v4: Enhance Tier 2 with real technical analysis if available
  const tier2 = { ...tier2Raw }
  if (technicalSignals && technicalSignals.compositeConfidence > 20) {
    // Blend CoinGecko momentum (30%) with TA indicators (70%)
    // TA is more reliable because it uses RSI, SMA, Bollinger from actual price history
    const taScore = technicalSignals.compositeScore
    const blended = tier2Raw.available
      ? Math.round(tier2Raw.score * 0.3 + taScore * 0.7)
      : taScore
    tier2.score = clamp(blended, -100, 100)
    tier2.confidence = Math.max(tier2.confidence, technicalSignals.compositeConfidence)
    tier2.available = true
    tier2.factors = {
      ...tier2.factors,
      rsi14: technicalSignals.rsi14,
      rsiSignal: technicalSignals.rsiSignal,
      smaSignal: technicalSignals.smaSignal,
      bbSignal: technicalSignals.bbSignal,
      regime: technicalSignals.regime,
      taComposite: taScore,
    }
  }

  // v6: Regime affects CONFIDENCE only, not score magnitude
  // v4's regime multiplier on raw score was squashing everything to NEUTRAL
  let regimeConfidencePenalty = 0
  let regimeNote = ''
  if (technicalSignals) {
    if (technicalSignals.regime === 'trending_down') {
      regimeConfidencePenalty = 15 // reduce confidence, not score
      regimeNote = 'Downtrend detected'
    } else if (technicalSignals.regime === 'high_volatility') {
      regimeConfidencePenalty = 20
      regimeNote = 'High volatility regime'
    }
  }

  // v5: Derivatives data (funding rates, long/short ratios) — most predictive short-term indicator
  const hasDeriv = derivativesData && derivativesData.available
  const derivScore = hasDeriv ? derivativesData.compositeSignal : 0
  const derivConf = hasDeriv ? 70 : 0

  // v5 weights with derivatives: T1=20%, T2=30%, T3=15%, T4=5%, derivatives=30%
  // Without derivatives: fallback to v3 weights T1=25%, T2=40%, T3=25%, T4=10%
  // IC_FIX_ENABLED: zero out T2 (no measurable edge per IC audit) and
  // redistribute to T1 + T3, the only tiers with ranking power.
  const baseWeights = IC_FIX_ENABLED
    ? (hasDeriv
        ? { tier1: 0.30, tier2: 0.00, tier3: 0.30, tier4: 0.05 }
        : { tier1: 0.45, tier2: 0.00, tier3: 0.45, tier4: 0.10 })
    : (hasDeriv
        ? { tier1: 0.20, tier2: 0.30, tier3: 0.15, tier4: 0.05 }
        : { tier1: 0.25, tier2: 0.40, tier3: 0.25, tier4: 0.10 })
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

  // v5: Add derivatives signal (30% weight when available)
  if (hasDeriv) {
    rawScore += derivScore * 0.30
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
  //
  // IC_FIX_ENABLED: disabled. This bonus amplified Tier 1's direction; with
  // Tier 1 historically inverted (mean IC = -0.16) and Tier 2 noise (IC ≈ 0),
  // the bonus was systematically pushing the score in the wrong direction.
  // Re-enable only after a clean IC audit confirms Tier 1 is correctly signed.
  let smartMoneyBonus = 0
  if (!IC_FIX_ENABLED && tier1.available && tier2.available && tier1.confidence >= 40) {
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

  // v6: Tier disagreement — reduced penalty from 25 to 10
  // 25 was too harsh combined with regime penalty, forced everything NEUTRAL
  let tierDisagreementPenalty = 0
  if (tier1.available && tier2.available) {
    const whaleDir = Math.sign(tier1.score)
    const momentumDir = Math.sign(tier2.score)
    if (whaleDir !== 0 && momentumDir !== 0 && whaleDir !== momentumDir) {
      tierDisagreementPenalty = 10
    }
  }

  let baseConfidence = 0
  for (const t of availableTiers) {
    baseConfidence += t.data.confidence * t.effectiveWeight
  }
  if (hasDeriv) baseConfidence += derivConf * 0.30
  const confidence = Math.round(
    Math.min(100, Math.max(0, baseConfidence * confluenceMultiplier - confidenceReduction - tierDisagreementPenalty - regimeConfidencePenalty))
  )

  const score = Math.round(clamp((rawScore + 100) / 2, 0, 100))

  // Per-token calibration gate. If we have a recent calibration row but the
  // confidence score is below 20, force NEUTRAL.
  // The calibration cron computes confidence_score = max(|hit_rate-0.5|*200,
  // |IC|*100). A score < 20 means EITHER hit_rate is in [0.40, 0.60] (coin
  // flip) AND |IC| < 0.20 (no magnitude correlation either) — the engine
  // should not stake an opinion on a token whose own track record is that thin.
  // This is independent of `confidence` (within-snapshot tier agreement);
  // `confidence` says "how sure is this snapshot", calibration says "how
  // sure is the engine on this TOKEN historically".
  const CALIBRATION_LABEL_GATE = 20
  const failsCalibrationGate =
    !!calibration &&
    calibration.nOutcomes >= 20 &&
    calibration.confidenceScore < CALIBRATION_LABEL_GATE

  const signal: SignalLabel = failsCalibrationGate
    ? 'NEUTRAL'
    : getSignalLabel(score, confidence)

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
  // v7: Include derivatives as a factor when available
  if (hasDeriv) {
    factors.push({
      name: 'Derivatives',
      score: derivScore,
      weight: 30,
      contribution: Math.round(derivScore * 0.30),
    })
  }
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  const timeframe = determineTimeframe(tier1, tier2)

  // v4: Add regime detection to traps if applicable
  if (regimeNote) {
    traps.push({
      type: 'REGIME_WARNING',
      severity: 'MEDIUM',
      description: regimeNote,
    })
  }

  return {
    signal,
    score,
    confidence,
    rawScore: Math.round(rawScore),
    factors: factors.slice(0, 5),
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
  // v6 thresholds — balanced band that actually fires signals
  // v3-v5 had 35-65 NEUTRAL which was too wide (100% NEUTRAL output)
  if (confidence < 15) return 'NEUTRAL'
  if (score >= 72) return 'STRONG BUY'
  if (score >= 58) return 'BUY'
  if (score > 42 && score < 58) return 'NEUTRAL'  // 16-point band (was 30)
  if (score <= 28) return 'STRONG SELL'
  if (score <= 42) return 'SELL'
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
