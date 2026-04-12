/**
 * Binance Derivatives Data Module
 * 
 * Fetches funding rates, open interest, and long/short ratios
 * from Binance Futures API (free, no API key required).
 * 
 * These are the most predictive short-term indicators in crypto:
 * - Funding rate: positive = longs pay shorts (market overleveraged long)
 * - Open interest: total value of outstanding contracts
 * - Long/short ratio: retail positioning
 */

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com'

export interface DerivativesData {
  // Funding rate
  fundingRate: number         // current 8h funding rate (e.g., 0.0001 = 0.01%)
  fundingRateAnnualized: number // annualized for context
  fundingSignal: number       // -100 to +100
  
  // Open interest
  openInterest: number        // in token quantity
  openInterestUsd: number     // approximate USD value
  
  // Long/short positioning
  longRatio: number           // 0-1 (percentage of long accounts)
  shortRatio: number          // 0-1 (percentage of short accounts)
  longShortRatio: number      // >1 = more longs, <1 = more shorts
  longShortSignal: number     // -100 to +100 (contrarian: extreme longs = bearish)
  
  // Top trader positioning
  topTraderLongRatio: number
  topTraderShortRatio: number
  topTraderSignal: number     // -100 to +100
  
  // Taker buy/sell volume (direct aggression measurement)
  takerBuySellRatio: number   // >1 = buyers aggressive, <1 = sellers aggressive
  takerSignal: number         // -100 to +100
  
  // Composite
  compositeSignal: number     // -100 to +100
  available: boolean
}

const DEFAULT_RESULT: DerivativesData = {
  fundingRate: 0, fundingRateAnnualized: 0, fundingSignal: 0,
  openInterest: 0, openInterestUsd: 0,
  longRatio: 0.5, shortRatio: 0.5, longShortRatio: 1, longShortSignal: 0,
  topTraderLongRatio: 0.5, topTraderShortRatio: 0.5, topTraderSignal: 0,
  takerBuySellRatio: 1, takerSignal: 0,
  compositeSignal: 0, available: false,
}

// Tokens that DON'T have Binance USDT perpetuals
// v7: Removed PEPE and SHIB — they have had USDT perpetuals since 2023
const NO_FUTURES = new Set(['MKR', 'LRC', 'FXS', 'WBTC', 'WETH'])

/**
 * Fetch all derivatives data for a token from Binance Futures API.
 * Returns null for tokens without futures markets.
 * No API key required — these are public endpoints.
 */
export async function fetchDerivativesData(
  tokenSymbol: string,
  currentPriceUsd?: number
): Promise<DerivativesData> {
  if (NO_FUTURES.has(tokenSymbol)) return DEFAULT_RESULT

  const symbol = `${tokenSymbol}USDT`

  try {
    const [fundingRes, oiRes, lsRes, topRes, takerRes] = await Promise.allSettled([
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=1`),
    ])

    // Funding rate
    let fundingRate = 0
    if (fundingRes.status === 'fulfilled' && fundingRes.value?.[0]) {
      fundingRate = parseFloat(fundingRes.value[0].fundingRate) || 0
    }
    const fundingRateAnnualized = fundingRate * 3 * 365 * 100 // 3 × daily × 365 × 100 for %

    // Funding signal: extreme positive funding = market overleveraged long = BEARISH (contrarian)
    // Normal range: -0.01% to +0.01%. Extreme: >0.05% or <-0.05%
    let fundingSignal = 0
    if (Math.abs(fundingRate) > 0.0001) {
      // Contrarian: high positive funding = bearish, high negative = bullish
      fundingSignal = -Math.tanh(fundingRate * 5000) * 80
    }

    // Open interest
    let openInterest = 0
    let openInterestUsd = 0
    if (oiRes.status === 'fulfilled' && oiRes.value) {
      openInterest = parseFloat(oiRes.value.openInterest) || 0
      openInterestUsd = currentPriceUsd ? openInterest * currentPriceUsd : 0
    }

    // Long/short ratio (all accounts)
    let longRatio = 0.5, shortRatio = 0.5, longShortRatio = 1
    if (lsRes.status === 'fulfilled' && lsRes.value?.[0]) {
      longRatio = parseFloat(lsRes.value[0].longAccount) || 0.5
      shortRatio = parseFloat(lsRes.value[0].shortAccount) || 0.5
      longShortRatio = parseFloat(lsRes.value[0].longShortRatio) || 1
    }

    // Long/short signal: CONTRARIAN
    // >60% long = crowded long = bearish signal
    // >60% short = crowded short = bullish signal (squeeze potential)
    let longShortSignal = 0
    if (longRatio > 0.65) longShortSignal = -60  // very crowded long = bearish
    else if (longRatio > 0.60) longShortSignal = -30
    else if (shortRatio > 0.65) longShortSignal = 60 // very crowded short = bullish (squeeze)
    else if (shortRatio > 0.60) longShortSignal = 30
    // Between 40-60% = no strong signal

    // Top trader positioning
    let topTraderLongRatio = 0.5, topTraderShortRatio = 0.5
    if (topRes.status === 'fulfilled' && topRes.value?.[0]) {
      topTraderLongRatio = parseFloat(topRes.value[0].longAccount) || 0.5
      topTraderShortRatio = parseFloat(topRes.value[0].shortAccount) || 0.5
    }

    // Top trader signal: if top traders are heavily short while retail is long = very bearish
    let topTraderSignal = 0
    if (topTraderLongRatio > 0.60) topTraderSignal = 20  // top traders long = mild bullish
    else if (topTraderShortRatio > 0.60) topTraderSignal = -20 // top traders short = mild bearish

    // Smart money divergence: top traders vs retail
    if (longRatio > 0.58 && topTraderShortRatio > 0.55) {
      topTraderSignal = -50
    } else if (shortRatio > 0.58 && topTraderLongRatio > 0.55) {
      topTraderSignal = 50
    }

    // Taker buy/sell volume — direct aggression measurement
    let takerBuySellRatio = 1
    let takerSignal = 0
    if (takerRes.status === 'fulfilled' && takerRes.value?.[0]) {
      takerBuySellRatio = parseFloat(takerRes.value[0].buySellRatio) || 1
      // Continuous signal: ratio > 1 = buyers aggressive, < 1 = sellers aggressive
      takerSignal = Math.round(Math.tanh((takerBuySellRatio - 1.0) * 5) * 80)
    }

    // Composite: funding 30%, long/short 25%, top traders 20%, taker volume 25%
    const compositeSignal = Math.round(
      fundingSignal * 0.30 + longShortSignal * 0.25 + topTraderSignal * 0.20 + takerSignal * 0.25
    )

    return {
      fundingRate,
      fundingRateAnnualized: +fundingRateAnnualized.toFixed(2),
      fundingSignal: Math.round(fundingSignal),
      openInterest,
      openInterestUsd: Math.round(openInterestUsd),
      longRatio: +longRatio.toFixed(4),
      shortRatio: +shortRatio.toFixed(4),
      longShortRatio: +longShortRatio.toFixed(4),
      longShortSignal,
      topTraderLongRatio: +topTraderLongRatio.toFixed(4),
      topTraderShortRatio: +topTraderShortRatio.toFixed(4),
      topTraderSignal,
      takerBuySellRatio: +takerBuySellRatio.toFixed(4),
      takerSignal,
      compositeSignal,
      available: true,
    }
  } catch (err) {
    console.error(`[Derivatives] Error fetching ${symbol}:`, (err as Error).message)
    return DEFAULT_RESULT
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) return null
  return res.json()
}
