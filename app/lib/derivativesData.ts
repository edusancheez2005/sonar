/**
 * Derivatives Data Module — Binance primary, Bybit fallback
 *
 * Fetches funding rates, open interest, and long/short ratios from
 * crypto-derivatives venues (free, no API key required).
 *
 * Source order:
 *   1. Binance Futures (fapi.binance.com) — preferred when reachable.
 *   2. Bybit V5 linear perps (api.bybit.com) — fallback covering funding,
 *      open interest, and global long/short. top-trader and taker volume
 *      are zeroed on the fallback (Bybit V5 does not expose direct
 *      equivalents in the free public surface).
 *
 * Background (2026-06-01): the Binance Futures host returns non-200 from
 * Vercel serverless egress (geo-block; same failure mode as the api.binance.com
 * block of 2026-05-06). Until 2026-06-01 the failure was silent — every
 * underlying fetch returned null but `available: true` was still emitted
 * because `Promise.allSettled` swallowed the errors. That gave the engine
 * 1000 consecutive token_signals with funding_rate=0, smart_long=0.5,
 * taker_ratio=1 — all the DEFAULT_RESULT values masquerading as real data.
 * The grader and the §4.F backtest harness silently fed on this noise for
 * weeks. Fixed two bugs at once: (a) failover to Bybit, (b) `available`
 * is now true iff at least one of {funding, OI, long/short} actually
 * returned non-default data.
 *
 * Kill-switch: DERIVATIVES_FALLBACK=off forces Binance-only (legacy
 * behavior). Default ON.
 */

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com'
const BYBIT_V5_BASE = 'https://api.bybit.com'

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
  // Which venue actually produced the data we used. 'binance' = full feed,
  // 'bybit' = partial feed (top-trader + taker zeroed), 'none' = no data.
  // Added 2026-06-01 so the dashboard / forensic queries can stop
  // attributing zero-default rows to live signal.
  source?: 'binance' | 'bybit' | 'none'
}

const DEFAULT_RESULT: DerivativesData = {
  fundingRate: 0, fundingRateAnnualized: 0, fundingSignal: 0,
  openInterest: 0, openInterestUsd: 0,
  longRatio: 0.5, shortRatio: 0.5, longShortRatio: 1, longShortSignal: 0,
  topTraderLongRatio: 0.5, topTraderShortRatio: 0.5, topTraderSignal: 0,
  takerBuySellRatio: 1, takerSignal: 0,
  compositeSignal: 0, available: false, source: 'none',
}

// Tokens that DON'T have Binance USDT perpetuals
// v7: Removed PEPE and SHIB — they have had USDT perpetuals since 2023
const NO_FUTURES = new Set(['MKR', 'LRC', 'FXS', 'WBTC', 'WETH'])

/**
 * Fetch all derivatives data for a token. Tries Binance first; if Binance
 * does not return real funding data (geo-block or 4xx), falls back to Bybit
 * V5 for funding + OI + global long/short. Top-trader and taker volume are
 * zeroed on the Bybit path (V5 free surface does not expose direct
 * equivalents). Returns DEFAULT_RESULT with available=false when both
 * sources fail.
 */
export async function fetchDerivativesData(
  tokenSymbol: string,
  currentPriceUsd?: number
): Promise<DerivativesData> {
  if (NO_FUTURES.has(tokenSymbol)) return DEFAULT_RESULT

  // 1. Try Binance first. Binance gives us all 5 signal inputs when it
  //    works, so prefer it. Returns null when the underlying funding fetch
  //    fails — that's the canary for the geo-block. We then fall through.
  const binance = await fetchFromBinance(tokenSymbol, currentPriceUsd)
  if (binance) return binance

  // 2. Fallback: Bybit V5. Gives us funding + OI + global long/short.
  //    Top-trader and taker are zeroed (no free public equivalent in V5).
  //    Off by setting DERIVATIVES_FALLBACK=off (legacy Binance-only mode).
  if (process.env.DERIVATIVES_FALLBACK === 'off') return DEFAULT_RESULT
  const bybit = await fetchFromBybit(tokenSymbol, currentPriceUsd)
  if (bybit) return bybit

  return DEFAULT_RESULT
}

/**
 * Binance Futures source. Returns null when the funding-rate fetch
 * fails — that's our "the geo-block is active" canary and we fall through
 * to the Bybit fallback. Returns a full DerivativesData object when
 * funding succeeded, even if OI / long-short partially failed (those
 * degrade to defaults but `available` stays true because the funding
 * signal alone is meaningful).
 */
async function fetchFromBinance(
  tokenSymbol: string,
  currentPriceUsd?: number
): Promise<DerivativesData | null> {
  const symbol = `${tokenSymbol}USDT`
  try {
    const [fundingRes, oiRes, lsRes, topRes, takerRes] = await Promise.allSettled([
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=1`),
      fetchWithTimeout(`${BINANCE_FUTURES_BASE}/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=1`),
    ])

    // Canary: if funding rate is missing, treat the whole Binance path as
    // unavailable and let the caller fall through. Funding is the highest-
    // signal field and the cheapest endpoint; if it fails the rest almost
    // certainly did too (same geo-block).
    const fundingPayload = fundingRes.status === 'fulfilled' ? fundingRes.value : null
    if (!fundingPayload || !fundingPayload[0] || fundingPayload[0].fundingRate === undefined) {
      return null
    }
    const fundingRate = parseFloat(fundingPayload[0].fundingRate) || 0
    const fundingRateAnnualized = fundingRate * 3 * 365 * 100

    let fundingSignal = 0
    if (Math.abs(fundingRate) > 0.0001) {
      fundingSignal = -Math.tanh(fundingRate * 5000) * 80
    }

    let openInterest = 0
    let openInterestUsd = 0
    if (oiRes.status === 'fulfilled' && oiRes.value) {
      openInterest = parseFloat(oiRes.value.openInterest) || 0
      openInterestUsd = currentPriceUsd ? openInterest * currentPriceUsd : 0
    }

    let longRatio = 0.5, shortRatio = 0.5, longShortRatio = 1
    if (lsRes.status === 'fulfilled' && lsRes.value?.[0]) {
      longRatio = parseFloat(lsRes.value[0].longAccount) || 0.5
      shortRatio = parseFloat(lsRes.value[0].shortAccount) || 0.5
      longShortRatio = parseFloat(lsRes.value[0].longShortRatio) || 1
    }

    let longShortSignal = 0
    if (longRatio > 0.65) longShortSignal = -60
    else if (longRatio > 0.60) longShortSignal = -30
    else if (shortRatio > 0.65) longShortSignal = 60
    else if (shortRatio > 0.60) longShortSignal = 30

    let topTraderLongRatio = 0.5, topTraderShortRatio = 0.5
    if (topRes.status === 'fulfilled' && topRes.value?.[0]) {
      topTraderLongRatio = parseFloat(topRes.value[0].longAccount) || 0.5
      topTraderShortRatio = parseFloat(topRes.value[0].shortAccount) || 0.5
    }

    let topTraderSignal = 0
    if (topTraderLongRatio > 0.60) topTraderSignal = 20
    else if (topTraderShortRatio > 0.60) topTraderSignal = -20

    if (longRatio > 0.58 && topTraderShortRatio > 0.55) {
      topTraderSignal = -50
    } else if (shortRatio > 0.58 && topTraderLongRatio > 0.55) {
      topTraderSignal = 50
    }

    let takerBuySellRatio = 1
    let takerSignal = 0
    if (takerRes.status === 'fulfilled' && takerRes.value?.[0]) {
      takerBuySellRatio = parseFloat(takerRes.value[0].buySellRatio) || 1
      takerSignal = Math.round(Math.tanh((takerBuySellRatio - 1.0) * 5) * 80)
    }

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
      source: 'binance',
    }
  } catch (err) {
    console.error(`[Derivatives:binance] ${symbol}:`, (err as Error).message)
    return null
  }
}

/**
 * Bybit V5 linear-perp source. Returns null when funding fetch fails.
 * Top-trader (smart-money) and taker buy/sell signals are zeroed because
 * Bybit V5 free public surface does not expose direct equivalents — the
 * composite still uses funding (30%) + global long/short (25%) = 55% of
 * the Binance information content. We prefer 55% real to 0% real.
 *
 * Bybit V5 docs: https://bybit-exchange.github.io/docs/v5/market
 *  - funding/history    → result.list[0].fundingRate (string decimal)
 *  - open-interest      → result.list[0].openInterest (base token units)
 *  - account-ratio      → result.list[0].buyRatio / sellRatio (decimals)
 */
async function fetchFromBybit(
  tokenSymbol: string,
  currentPriceUsd?: number
): Promise<DerivativesData | null> {
  const symbol = `${tokenSymbol}USDT`
  try {
    const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
      fetchWithTimeout(`${BYBIT_V5_BASE}/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`),
      fetchWithTimeout(`${BYBIT_V5_BASE}/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=1h&limit=1`),
      fetchWithTimeout(`${BYBIT_V5_BASE}/v5/market/account-ratio?category=linear&symbol=${symbol}&period=1h&limit=1`),
    ])

    const fundingPayload = fundingRes.status === 'fulfilled' ? fundingRes.value : null
    const fundingItem = fundingPayload?.result?.list?.[0]
    if (!fundingItem || fundingItem.fundingRate === undefined) {
      // Bybit failed too — caller will return DEFAULT_RESULT.
      return null
    }
    const fundingRate = parseFloat(fundingItem.fundingRate) || 0
    const fundingRateAnnualized = fundingRate * 3 * 365 * 100

    let fundingSignal = 0
    if (Math.abs(fundingRate) > 0.0001) {
      fundingSignal = -Math.tanh(fundingRate * 5000) * 80
    }

    let openInterest = 0
    let openInterestUsd = 0
    const oiItem = oiRes.status === 'fulfilled' ? oiRes.value?.result?.list?.[0] : null
    if (oiItem?.openInterest !== undefined) {
      openInterest = parseFloat(oiItem.openInterest) || 0
      openInterestUsd = currentPriceUsd ? openInterest * currentPriceUsd : 0
    }

    let longRatio = 0.5, shortRatio = 0.5, longShortRatio = 1
    const lsItem = lsRes.status === 'fulfilled' ? lsRes.value?.result?.list?.[0] : null
    if (lsItem?.buyRatio !== undefined && lsItem?.sellRatio !== undefined) {
      longRatio = parseFloat(lsItem.buyRatio) || 0.5
      shortRatio = parseFloat(lsItem.sellRatio) || 0.5
      longShortRatio = shortRatio > 0 ? longRatio / shortRatio : 1
    }

    let longShortSignal = 0
    if (longRatio > 0.65) longShortSignal = -60
    else if (longRatio > 0.60) longShortSignal = -30
    else if (shortRatio > 0.65) longShortSignal = 60
    else if (shortRatio > 0.60) longShortSignal = 30

    // Composite re-weights to the channels we actually have: funding+L/S
    // alone normalised to the same -100..+100 scale. Without top-trader
    // and taker, we re-normalise their 0.30+0.25=0.55 share to 1.0 so
    // a strong funding signal isn't artificially capped.
    const compositeSignal = Math.round(
      (fundingSignal * 0.30 + longShortSignal * 0.25) / 0.55
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
      // Smart-money + taker not available on Bybit free surface; leave as
      // defaults but explicitly zeroed (vs Binance defaults which are 0.5
      // for ratios so downstream logic doesn't read them as a signal).
      topTraderLongRatio: 0.5,
      topTraderShortRatio: 0.5,
      topTraderSignal: 0,
      takerBuySellRatio: 1,
      takerSignal: 0,
      compositeSignal,
      available: true,
      source: 'bybit',
    }
  } catch (err) {
    console.error(`[Derivatives:bybit] ${symbol}:`, (err as Error).message)
    return null
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  // CRITICAL: cache:'no-store' — Next.js fetch-cache would freeze derivatives
  // (funding rate, long/short ratios) which feed the deriv tier (25% weight).
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}
