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
    // OKX fallback (Binance futures 451s from Vercel): the module hard-codes
    // the global long ratio at 0.5 and zeroes taker data, and its "top trader"
    // figure is OKX's all-accounts long/short ratio. Report what OKX measured;
    // outlook answers had said "~50% long" from the placeholder (2026-10-06).
    const okx = d.source === 'okx'
    const pct = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x * 1000) / 10 : null)
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
        long_ratio_pct: okx ? pct(d.topTraderLongRatio) : pct(d.longRatio),
        long_ratio_scope: okx ? 'all OKX accounts' : 'all Binance accounts',
        top_trader_long_pct: okx ? null : pct(d.topTraderLongRatio),
        taker_buy_sell_ratio: !okx && Number.isFinite(d.takerBuySellRatio) ? d.takerBuySellRatio : null,
        note: 'Describe positioning factually (crowded longs/shorts, funding sign); never forecast.',
      },
      source: 'derivatives',
      fetched_at,
    }
  } catch (err: any) {
    return { ok: false, data: null, source: 'derivatives', fetched_at, error: err?.message ?? 'unknown' }
  }
}
