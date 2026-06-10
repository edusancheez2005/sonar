/**
 * Frozen price-feed detection for fetch-prices (2026-06-10).
 *
 * WHY. Some upstream USDT pairs serve a quote that is stuck at a single value
 * for hours/days while the rest of the feed is live — the MATICUSDT-zombie
 * class. On 2026-06-10, LRC and MKR were observed frozen across 97 consecutive
 * 15-minute snapshots despite real 24h volume on Binance. Ingesting a frozen
 * price poisons signal evaluation (price_change = 0 on every window) and the
 * alpha series. The exact upstream culprit (Binance mirror vs CoinGecko key)
 * can differ by region/deploy, so detection must be SOURCE-AGNOSTIC: we judge
 * the symptom (an unbroken run of identical prints), not the provider.
 *
 * Pure + deterministic: no I/O, no Date.now(). Mirrors lib/quant/beta.ts.
 */

export interface FrozenDetectOptions {
  /**
   * Number of most-recent consecutive identical stored prints required before
   * a ticker is judged frozen. At a 15-min cadence, 6 ≈ 90 minutes. Higher =
   * more conservative (fewer false positives on a genuinely flat token, slower
   * to catch a real freeze). Default 6.
   */
  minRun?: number
  /**
   * Tickers exempt from the check — stablecoins (USDT/USDC/DAI…) legitimately
   * sit at a near-constant value and must never be flagged. Compared
   * case-insensitively by the caller's own normalisation (pass upper-case).
   */
  exemptTickers?: ReadonlySet<string>
}

const DEFAULT_MIN_RUN = 6

/**
 * Identify tickers whose INCOMING price continues an existing frozen run.
 *
 * A ticker is frozen iff:
 *   - it is not exempt,
 *   - it has at least `minRun` recent stored prints,
 *   - the newest `minRun` stored prints are all exactly equal, AND
 *   - the incoming price also equals that frozen value.
 *
 * The final clause is load-bearing: if the incoming price DIFFERS from the
 * frozen run, the feed just recovered this tick and we must NOT suppress it.
 *
 * @param incoming        ticker → incoming price for this run
 * @param recentByTicker  ticker → recent stored prices, NEWEST FIRST
 *                        (exclude the incoming value; this is prior history)
 * @returns sorted list of frozen tickers the caller should skip ingesting
 */
export function findFrozenTickers(
  incoming: Readonly<Record<string, number>>,
  recentByTicker: Readonly<Record<string, readonly number[]>>,
  options: FrozenDetectOptions = {},
): string[] {
  const minRun = options.minRun ?? DEFAULT_MIN_RUN
  const exempt = options.exemptTickers
  const frozen: string[] = []

  for (const ticker of Object.keys(incoming)) {
    if (exempt && exempt.has(ticker)) continue
    const price = incoming[ticker]
    if (!Number.isFinite(price)) continue

    const hist = recentByTicker[ticker]
    if (!hist || hist.length < minRun) continue

    const run = hist.slice(0, minRun)
    const frozenValue = run[0]
    const runAllEqual = run.every(p => p === frozenValue)
    if (runAllEqual && price === frozenValue) {
      frozen.push(ticker)
    }
  }

  return frozen.sort()
}
