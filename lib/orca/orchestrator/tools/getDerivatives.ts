/**
 * Tool: getDerivatives
 * =============================================================================
 * Perp funding rate, open interest and long/short positioning for ONE
 * ticker (Binance futures, OKX fallback) — exposes the already-existing
 * fetchDerivativesData helper (used by the v1 note and Whale Whisper) as an
 * orchestrator tool. Coverage audit 2026-09-23: "why did X drop / is it
 * leveraged / funding on Y" questions had no tool.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { fetchDerivativesData } from '@/app/lib/derivativesData'

export interface GetDerivativesArgs {
  ticker?: unknown
}

export async function run(
  args: GetDerivativesArgs,
  _supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = typeof args.ticker === 'string' ? args.ticker.trim().toUpperCase() : ''
  if (!/^[A-Z0-9]{2,12}$/.test(ticker)) {
    return { ok: false, data: null, source: 'derivatives', fetched_at, error: 'invalid_ticker' }
  }
  try {
    const d: any = await fetchDerivativesData(ticker)
    if (!d || !d.available) {
      return { ok: false, data: null, source: 'derivatives', fetched_at, error: 'derivatives_unavailable' }
    }
    return {
      ok: true,
      data: {
        ticker,
        source_exchange: d.source ?? null,
        funding_rate_8h: d.fundingRate,
        funding_rate_8h_pct: Number.isFinite(d.fundingRate) ? Math.round(d.fundingRate * 1e6) / 1e4 : null,
        // helper already returns a PERCENT (fundingRate*3*365*100) — the first
        // release multiplied by 100 again and showed 441% for 4.41% (battery n-03).
        funding_rate_annualized_pct: Number.isFinite(d.fundingRateAnnualized) ? Math.round(d.fundingRateAnnualized * 100) / 100 : null,
        open_interest_tokens: d.openInterest ?? null,
        open_interest_usd: d.openInterestUsd ?? null,
        long_ratio_pct: Number.isFinite(d.longRatio) ? Math.round(d.longRatio * 1000) / 10 : null,
        top_trader_long_pct: Number.isFinite(d.topTraderLongRatio) && d.topTraderLongRatio > 0 ? Math.round(d.topTraderLongRatio * 1000) / 10 : null,
        taker_buy_sell_ratio: Number.isFinite(d.takerBuySellRatio) ? d.takerBuySellRatio : null,
        note: 'Describe positioning factually (crowded longs/shorts, funding sign); never forecast.',
      },
      source: 'derivatives',
      fetched_at,
    }
  } catch (err: any) {
    return { ok: false, data: null, source: 'derivatives', fetched_at, error: err?.message ?? 'unknown' }
  }
}
