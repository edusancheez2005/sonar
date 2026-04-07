/**
 * Technical Analysis Module for Signal Engine v4
 * 
 * Computes RSI, SMA crossovers, Bollinger Bands, ATR, and ADX
 * from price_snapshots data (collected every 15 minutes).
 * 
 * Uses the `trading-signals` npm package for calculations.
 * All indicators are computed server-side from historical price data.
 */

import { RSI, SMA, BollingerBands, ATR, ADX, EMA } from 'trading-signals'

export interface PriceCandle {
  price: number
  high?: number
  low?: number
  volume?: number
  timestamp: string
}

export interface TechnicalSignals {
  // RSI
  rsi14: number | null
  rsiSignal: number // -100 to +100 (overbought/oversold)
  
  // Moving averages
  sma20: number | null
  sma50: number | null
  ema12: number | null
  ema26: number | null
  priceVsSma20: number // % above/below SMA20
  priceVsSma50: number // % above/below SMA50
  smaSignal: number // -100 to +100 (trend direction)
  
  // Bollinger Bands
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  bbWidth: number | null
  bbPosition: number // 0-1 (where price sits in the band)
  bbSignal: number // -100 to +100
  
  // Regime detection
  adx14: number | null // trend strength (>25 = trending)
  atrPercent: number | null // volatility as % of price
  regime: 'trending_up' | 'trending_down' | 'ranging' | 'high_volatility' | 'unknown'
  regimeConfidence: number // 0-100

  // Composite
  compositeScore: number // -100 to +100
  compositeConfidence: number // 0-100
}

/**
 * Compute technical indicators from an array of price candles.
 * Candles must be sorted oldest → newest.
 * Needs at least 50 candles for meaningful signals (50 × 15min = 12.5 hours).
 */
export function computeTechnicalIndicators(
  candles: PriceCandle[],
  currentPrice: number
): TechnicalSignals {
  const defaults: TechnicalSignals = {
    rsi14: null, rsiSignal: 0,
    sma20: null, sma50: null, ema12: null, ema26: null,
    priceVsSma20: 0, priceVsSma50: 0, smaSignal: 0,
    bbUpper: null, bbMiddle: null, bbLower: null, bbWidth: null, bbPosition: 0.5, bbSignal: 0,
    adx14: null, atrPercent: null,
    regime: 'unknown', regimeConfidence: 0,
    compositeScore: 0, compositeConfidence: 0,
  }

  if (!candles || candles.length < 20 || !currentPrice) return defaults

  const prices = candles.map(c => c.price).filter(p => p > 0)
  if (prices.length < 20) return defaults

  // ─── RSI (14-period) ───
  let rsi14: number | null = null
  try {
    const rsiCalc = new RSI(14)
    for (const p of prices) rsiCalc.update(p)
    if (rsiCalc.isStable) rsi14 = Number(rsiCalc.getResult().toFixed(2))
  } catch { /* not enough data */ }

  // RSI signal: oversold (<30) = bullish, overbought (>70) = bearish
  let rsiSignal = 0
  if (rsi14 !== null) {
    if (rsi14 < 25) rsiSignal = 80 // deeply oversold = strong buy signal
    else if (rsi14 < 30) rsiSignal = 50
    else if (rsi14 < 40) rsiSignal = 20
    else if (rsi14 > 75) rsiSignal = -80 // deeply overbought = strong sell signal
    else if (rsi14 > 70) rsiSignal = -50
    else if (rsi14 > 60) rsiSignal = -20
    // 40-60 = neutral (rsiSignal stays 0)
  }

  // ─── SMAs (20 and 50 period) ───
  let sma20: number | null = null
  let sma50: number | null = null
  try {
    const sma20Calc = new SMA(20)
    for (const p of prices) sma20Calc.update(p)
    if (sma20Calc.isStable) sma20 = Number(sma20Calc.getResult().toFixed(6))
  } catch {}
  try {
    if (prices.length >= 50) {
      const sma50Calc = new SMA(50)
      for (const p of prices) sma50Calc.update(p)
      if (sma50Calc.isStable) sma50 = Number(sma50Calc.getResult().toFixed(6))
    }
  } catch {}

  // ─── EMAs (12 and 26 for MACD-like signal) ───
  let ema12: number | null = null
  let ema26: number | null = null
  try {
    const ema12Calc = new EMA(12)
    for (const p of prices) ema12Calc.update(p)
    if (ema12Calc.isStable) ema12 = Number(ema12Calc.getResult().toFixed(6))
  } catch {}
  try {
    if (prices.length >= 26) {
      const ema26Calc = new EMA(26)
      for (const p of prices) ema26Calc.update(p)
      if (ema26Calc.isStable) ema26 = Number(ema26Calc.getResult().toFixed(6))
    }
  } catch {}

  // SMA signal: price position relative to moving averages
  const priceVsSma20 = sma20 ? ((currentPrice - sma20) / sma20) * 100 : 0
  const priceVsSma50 = sma50 ? ((currentPrice - sma50) / sma50) * 100 : 0

  let smaSignal = 0
  // Price above both SMAs = bullish trend, below both = bearish trend
  if (sma20 && sma50) {
    const aboveBoth = currentPrice > sma20 && currentPrice > sma50
    const belowBoth = currentPrice < sma20 && currentPrice < sma50
    const sma20AboveSma50 = sma20 > sma50 // golden cross state
    
    if (aboveBoth && sma20AboveSma50) smaSignal = 60  // strong uptrend
    else if (aboveBoth) smaSignal = 30
    else if (belowBoth && !sma20AboveSma50) smaSignal = -60 // strong downtrend
    else if (belowBoth) smaSignal = -30
    // Mixed = 0
  } else if (sma20) {
    smaSignal = currentPrice > sma20 ? 25 : -25
  }

  // EMA crossover signal (MACD direction)
  let macdSignal = 0
  if (ema12 && ema26) {
    const macdLine = ema12 - ema26
    const macdPct = ema26 > 0 ? (macdLine / ema26) * 100 : 0
    macdSignal = Math.tanh(macdPct * 5) * 50 // bounded to ±50
  }

  // ─── Bollinger Bands (20-period, 2 std dev) ───
  let bbUpper: number | null = null
  let bbMiddle: number | null = null
  let bbLower: number | null = null
  let bbWidth: number | null = null
  let bbPosition = 0.5
  try {
    const bbCalc = new BollingerBands(20, 2)
    for (const p of prices) bbCalc.update(p)
    if (bbCalc.isStable) {
      const bb = bbCalc.getResult()
      bbUpper = Number(bb.upper.toFixed(6))
      bbMiddle = Number(bb.middle.toFixed(6))
      bbLower = Number(bb.lower.toFixed(6))
      bbWidth = bbUpper - bbLower
      // Position: 0 = at lower band, 1 = at upper band
      bbPosition = bbWidth > 0 ? (currentPrice - bbLower) / bbWidth : 0.5
    }
  } catch {}

  // BB signal: price near lower band = oversold (bullish), near upper = overbought (bearish)
  let bbSignal = 0
  if (bbUpper !== null && bbLower !== null) {
    if (bbPosition < 0.1) bbSignal = 60 // price at or below lower band
    else if (bbPosition < 0.25) bbSignal = 30
    else if (bbPosition > 0.9) bbSignal = -60 // price at or above upper band
    else if (bbPosition > 0.75) bbSignal = -30
    // 0.25-0.75 = neutral
  }

  // ─── ADX (Trend Strength) — approximate from price data ───
  // Note: ADX ideally uses high/low/close candles. We approximate from close prices.
  let adx14: number | null = null
  let atrPercent: number | null = null
  try {
    if (prices.length >= 28) {
      // Compute ATR-like from close-to-close changes
      const changes: number[] = []
      for (let i = 1; i < prices.length; i++) {
        changes.push(Math.abs(prices[i] - prices[i - 1]))
      }
      // 14-period average true range approximation
      const atr14 = changes.slice(-14).reduce((s, v) => s + v, 0) / 14
      atrPercent = currentPrice > 0 ? (atr14 / currentPrice) * 100 : 0

      // ADX approximation: measure trend consistency
      // Count how many of last 14 closes were in the same direction
      const recentMoves = prices.slice(-15)
      let upMoves = 0
      let downMoves = 0
      for (let i = 1; i < recentMoves.length; i++) {
        if (recentMoves[i] > recentMoves[i - 1]) upMoves++
        else if (recentMoves[i] < recentMoves[i - 1]) downMoves++
      }
      const trendConsistency = Math.abs(upMoves - downMoves) / 14
      adx14 = Math.round(trendConsistency * 50 + 10) // rough ADX scale: 10-60
    }
  } catch {}

  // ─── Regime Detection ───
  let regime: TechnicalSignals['regime'] = 'unknown'
  let regimeConfidence = 0

  if (adx14 !== null && atrPercent !== null && bbWidth !== null && bbMiddle !== null) {
    const isHighVol = atrPercent > 3 // >3% per candle = high volatility
    const isTrending = adx14 > 25
    const bbWidthPct = bbMiddle > 0 ? (bbWidth / bbMiddle) * 100 : 0
    const isConsolidating = bbWidthPct < 3

    if (isHighVol) {
      regime = 'high_volatility'
      regimeConfidence = Math.min(80, Math.round(atrPercent * 15))
    } else if (isTrending && currentPrice > (sma20 || currentPrice)) {
      regime = 'trending_up'
      regimeConfidence = Math.min(80, adx14 * 2)
    } else if (isTrending && currentPrice < (sma20 || currentPrice)) {
      regime = 'trending_down'
      regimeConfidence = Math.min(80, adx14 * 2)
    } else {
      regime = 'ranging'
      regimeConfidence = isConsolidating ? 60 : 40
    }
  }

  // ─── Composite Score ───
  // Weight: RSI 25%, SMA/MACD trend 35%, Bollinger 20%, regime modifier 20%
  let compositeScore = 0
  let compositeConfidence = 0
  let componentCount = 0

  if (rsi14 !== null) {
    compositeScore += rsiSignal * 0.25
    componentCount++
  }
  if (sma20 !== null) {
    compositeScore += (smaSignal * 0.5 + macdSignal * 0.5) * 0.35
    componentCount++
  }
  if (bbUpper !== null) {
    compositeScore += bbSignal * 0.20
    componentCount++
  }

  // Regime modifier: suppress signals that fight the regime
  if (regime === 'trending_down' && compositeScore > 0) {
    compositeScore *= 0.5 // halve bullish signals in downtrends
  } else if (regime === 'trending_up' && compositeScore < 0) {
    compositeScore *= 0.5 // halve bearish signals in uptrends
  } else if (regime === 'high_volatility') {
    compositeScore *= 0.6 // reduce all signals in high vol
  }

  compositeScore = Math.round(Math.max(-100, Math.min(100, compositeScore)))
  compositeConfidence = Math.round(Math.min(100, componentCount * 25 + regimeConfidence * 0.3))

  return {
    rsi14, rsiSignal,
    sma20, sma50, ema12, ema26,
    priceVsSma20: +priceVsSma20.toFixed(2),
    priceVsSma50: +priceVsSma50.toFixed(2),
    smaSignal,
    bbUpper, bbMiddle, bbLower, bbWidth, bbPosition: +bbPosition.toFixed(3), bbSignal,
    adx14, atrPercent: atrPercent !== null ? +atrPercent.toFixed(3) : null,
    regime, regimeConfidence,
    compositeScore, compositeConfidence,
  }
}

/**
 * Z-score normalize a value against a rolling window.
 * Returns a value bounded by tanh to [-1, +1].
 */
export function zScoreNormalize(value: number, history: number[]): number {
  if (!history || history.length < 5) return 0
  const mean = history.reduce((s, v) => s + v, 0) / history.length
  const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length
  const std = Math.sqrt(variance)
  if (std < 0.001) return 0
  const zScore = (value - mean) / std
  return Math.tanh(zScore) // bounded to [-1, +1]
}

/**
 * Normalize sentiment using rate-of-change instead of absolute level.
 * A Galaxy Score of 70 means nothing. A jump from 45 to 70 in 48h means something.
 */
export function sentimentRateOfChange(current: number, previous: number, baseline: number = 50): number {
  const change = current - previous
  const normalizedChange = change / Math.max(1, Math.abs(baseline))
  return Math.tanh(normalizedChange * 3) * 100 // bounded to [-100, +100]
}
