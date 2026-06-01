/**
 * Derivatives Data Module — Binance primary, OKX fallback
 *
 * Fetches funding rates, open interest, and long/short ratios from
 * crypto-derivatives venues (free, no API key required).
 *
 * Source order (2026-06-01):
 *   1. Binance Futures (fapi.binance.com) — preferred when reachable.
 *      Gives the full 5-channel composite.
 *   2. OKX v5 SWAP (www.okx.com) — fallback covering funding +
 *      open-interest + top-trader account long/short ratio. Top-trader
 *      account ratio is the closest OKX equivalent to Binance's
 *      `topLongShortAccountRatio`; we treat it as the smart-money channel.
 *      Taker buy/sell is zeroed (OKX has the data but it requires
 *      historical aggregation we don't need yet).
 *
 * Why not Bybit: api.bybit.com is fronted by CloudFront and blocks
 * the Vercel egress region with a 403 (confirmed 2026-06-01 via
 * /api/debug/derivatives-probe). Bybit works fine from local US
 * residential IPs — DON'T be fooled by the local smoke test.
 *
 * Background (2026-06-01): the Binance Futures host returns 451 from
 * Vercel serverless egress (geo-block; same failure mode as the
 * api.binance.com block of 2026-05-06). Until 2026-06-01 the failure was
 * silent — every underlying fetch returned null but `available: true` was
 * still emitted because `Promise.allSettled` swallowed the errors. That
 * gave the engine 1000 consecutive token_signals with funding_rate=0,
 * smart_long=0.5, taker_ratio=1 — DEFAULT_RESULT values masquerading as
 * real data. The grader and the §4.F backtest harness silently fed on
 * this noise for weeks. Fixed two bugs at once: (a) actual reachable
 * fallback, (b) `available` is now true iff funding actually returned.
 *
 * Kill-switch: DERIVATIVES_FALLBACK=off forces Binance-only (legacy
 * behavior). Default ON.
 */

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com'
const OKX_BASE = 'https://www.okx.com'

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
  // 'okx' = partial feed (global L/S + taker zeroed), 'none' = no data.
  // Added 2026-06-01 so the dashboard / forensic queries can stop
  // attributing zero-default rows to live signal.
  source?: 'binance' | 'okx' | 'none'
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
 * does not return real funding data (geo-block or 4xx), falls back to OKX
 * for funding + OI + top-trader long/short. Taker buy/sell is zeroed on
 * the OKX path. Returns DEFAULT_RESULT with available=false when both
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

  // 2. Fallback: OKX SWAP. Gives funding + OI (in USD natively) + top-
  //    trader L/S ratio. Taker is zeroed (we'd need aggregated history).
  //    Off by setting DERIVATIVES_FALLBACK=off (legacy Binance-only mode).
  if (process.env.DERIVATIVES_FALLBACK === 'off') return DEFAULT_RESULT
  const okx = await fetchFromOkx(tokenSymbol, currentPriceUsd)
  if (okx) return okx

  return DEFAULT_RESULT
}

/**
 * Binance Futures source. Returns null when the funding-rate fetch
 * fails — that's our "the geo-block is active" canary and we fall through
 * to the OKX fallback. Returns a full DerivativesData object when
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
 * OKX SWAP source. Returns null when funding fetch fails. We treat OKX's
 * `top-trader account L/S ratio` as the smart-money channel (closest free
 * equivalent to Binance's topLongShortAccountRatio). Taker buy/sell is
 * zeroed (we'd need to aggregate the taker-volume time series). With
 * funding (30%) + top-trader (20%) we re-normalise the composite to keep
 * the -100..+100 scale meaningful.
 *
 * OKX v5 docs: https://www.okx.com/docs-v5/en/
 *  - public/funding-rate                          → data[0].fundingRate
 *  - public/open-interest (instType=SWAP)         → data[0].oiUsd (native)
 *  - rubik/stat/contracts/long-short-account-ratio (ccy=BTC, period=1H)
 *                                                 → data[0][1] (L/S ratio)
 */
async function fetchFromOkx(
  tokenSymbol: string,
  currentPriceUsd?: number
): Promise<DerivativesData | null> {
  const instId = `${tokenSymbol}-USDT-SWAP`
  try {
    const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
      fetchWithTimeout(`${OKX_BASE}/api/v5/public/funding-rate?instId=${instId}`),
      fetchWithTimeout(`${OKX_BASE}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`),
      fetchWithTimeout(`${OKX_BASE}/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${tokenSymbol}&period=1H`),
    ])

    // Canary: funding rate must come back. Without it the instId is bad
    // (token doesn't trade on OKX) or OKX is down — fall through.
    const fundingPayload = fundingRes.status === 'fulfilled' ? fundingRes.value : null
    const fundingItem = fundingPayload?.data?.[0]
    if (!fundingItem || fundingItem.fundingRate === undefined) {
      return null
    }
    const fundingRate = parseFloat(fundingItem.fundingRate) || 0
    const fundingRateAnnualized = fundingRate * 3 * 365 * 100

    let fundingSignal = 0
    if (Math.abs(fundingRate) > 0.0001) {
      fundingSignal = -Math.tanh(fundingRate * 5000) * 80
    }

    // OKX returns oiUsd directly. Use it as authoritative; derive openInterest
    // (base units) from oiCcy when present so downstream usage stays consistent.
    let openInterest = 0
    let openInterestUsd = 0
    const oiItem = oiRes.status === 'fulfilled' ? oiRes.value?.data?.[0] : null
    if (oiItem) {
      openInterestUsd = parseFloat(oiItem.oiUsd) || 0
      openInterest = parseFloat(oiItem.oiCcy) || (currentPriceUsd ? openInterestUsd / currentPriceUsd : 0)
    }

    // OKX top-trader account L/S ratio. data is array of [ts, ratio]
    // entries sorted newest first. Ratio R = longAccounts/shortAccounts,
    // so longPct = R/(R+1), shortPct = 1/(R+1).
    let topTraderLongRatio = 0.5, topTraderShortRatio = 0.5
    const lsArr = lsRes.status === 'fulfilled' ? lsRes.value?.data : null
    if (Array.isArray(lsArr) && lsArr.length > 0 && Array.isArray(lsArr[0])) {
      const r = parseFloat(lsArr[0][1])
      if (Number.isFinite(r) && r > 0) {
        topTraderLongRatio = r / (r + 1)
        topTraderShortRatio = 1 / (r + 1)
      }
    }

    let topTraderSignal = 0
    if (topTraderLongRatio > 0.65) topTraderSignal = -40       // crowded long = contrarian bearish
    else if (topTraderLongRatio > 0.60) topTraderSignal = -20
    else if (topTraderShortRatio > 0.65) topTraderSignal = 40
    else if (topTraderShortRatio > 0.60) topTraderSignal = 20

    // We don't have global L/S on OKX free surface. Leave at neutral defaults.
    const longRatio = 0.5, shortRatio = 0.5, longShortRatio = 1, longShortSignal = 0

    // Composite re-weights to the channels we actually have: funding (30%) +
    // top-trader (20%). Re-normalise to 1.0 so a strong signal isn't capped.
    const compositeSignal = Math.round(
      (fundingSignal * 0.30 + topTraderSignal * 0.20) / 0.50
    )

    return {
      fundingRate,
      fundingRateAnnualized: +fundingRateAnnualized.toFixed(2),
      fundingSignal: Math.round(fundingSignal),
      openInterest: Math.round(openInterest),
      openInterestUsd: Math.round(openInterestUsd),
      longRatio,
      shortRatio,
      longShortRatio,
      longShortSignal,
      topTraderLongRatio: +topTraderLongRatio.toFixed(4),
      topTraderShortRatio: +topTraderShortRatio.toFixed(4),
      topTraderSignal,
      takerBuySellRatio: 1,
      takerSignal: 0,
      compositeSignal,
      available: true,
      source: 'okx',
    }
  } catch (err) {
    console.error(`[Derivatives:okx] ${instId}:`, (err as Error).message)
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
