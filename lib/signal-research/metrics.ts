/**
 * Backtest metrics for the §4.F signal research kit.
 * =============================================================================
 * Pure helpers — given an array of forward-return observations (one per
 * fired signal), compute the summary stats we write to
 * signal_research_results.
 *
 * "Sharpe proxy" and "max drawdown proxy" are intentionally named with the
 * "proxy" suffix: these are computed on per-signal forward returns, NOT
 * on a continuous P&L curve from a real backtest. They are useful for
 * comparing families to each other and to the go/no-go threshold, not for
 * claiming live trading performance.
 */

export interface Observation {
  // Forward return in percent (e.g. 4.2 for +4.2%). Sign is from the
  // perspective of the signal's direction — i.e. a 'short' signal that
  // saw price drop 3% yields +3, not -3. The backtest harness normalises
  // before calling us.
  return_pct: number
}

export interface BacktestSummary {
  n_samples: number
  win_rate: number | null
  avg_pct: number | null
  sharpe_proxy: number | null
  max_drawdown_proxy: number | null
}

/**
 * win_rate = share of observations with return_pct > 0.
 * avg_pct = arithmetic mean of return_pct.
 * sharpe_proxy = mean / stddev (population stddev). Annualisation is NOT
 *   applied — the field is dimensionless and only meaningful comparing
 *   families against each other at the same window.
 * max_drawdown_proxy = the most negative single observation (worst trade).
 *   This is intentionally simpler than a path-dependent max-DD; the cron
 *   pipeline can compute the path-dependent version later.
 *
 * Returns null on empty input or when stddev is zero (degenerate). The
 * insert path forwards nulls to the DB unchanged.
 */
export function summarise(obs: Observation[]): BacktestSummary {
  const n = obs.length
  if (n === 0) {
    return {
      n_samples: 0,
      win_rate: null,
      avg_pct: null,
      sharpe_proxy: null,
      max_drawdown_proxy: null,
    }
  }
  let sum = 0
  let wins = 0
  let worst = obs[0].return_pct
  for (const o of obs) {
    sum += o.return_pct
    if (o.return_pct > 0) wins += 1
    if (o.return_pct < worst) worst = o.return_pct
  }
  const mean = sum / n
  let sqSum = 0
  for (const o of obs) {
    const d = o.return_pct - mean
    sqSum += d * d
  }
  const variance = sqSum / n
  const std = Math.sqrt(variance)
  const sharpe = std > 0 ? mean / std : null
  return {
    n_samples: n,
    win_rate: wins / n,
    avg_pct: mean,
    sharpe_proxy: sharpe,
    max_drawdown_proxy: worst,
  }
}

/**
 * Go / no-go gate per §4.F:
 *   n_samples >= 200 AND 24h_win_rate >= 0.60
 *
 * This helper does NOT enforce — it just labels. The actual promotion to
 * the production pipeline is a human decision; see deliverable 5.
 */
export function meetsPromotionBar(
  summary: BacktestSummary,
  window: '24h' | '3d' | '7d'
): { passes: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (summary.n_samples < 200) reasons.push(`n=${summary.n_samples} < 200`)
  if (window === '24h') {
    if (summary.win_rate == null || summary.win_rate < 0.6) {
      reasons.push(
        `24h win_rate=${summary.win_rate == null ? 'null' : summary.win_rate.toFixed(2)} < 0.60`
      )
    }
  }
  return { passes: reasons.length === 0, reasons }
}
