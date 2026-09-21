/**
 * Tool: getTopPerformingWallets
 * =============================================================================
 * Answers "most profitable wallet this week" / "best performing whales" /
 * "smartest money right now" — PROFITABILITY questions, which no other tool
 * covers (getMostActiveWallets ranks by activity, not returns).
 *
 * Source: app_cache key `anon_whale_backtests_7d`, written nightly by
 * /api/cron/backtest-whales (04:30 UTC). Each row is a simulated replay of a
 * top smart-money wallet's actual BUY/SELL fills over the last 7 days from a
 * $10k starting stake — so `return_pct_7d` is a comparable, sanity-capped
 * performance figure, not raw balance change (deposit-heavy wallets used to
 * show +28,000% before the TRANSFER_IN fix, dbc9cfd).
 *
 * Added 2026-09-21 after "whats the most profitable wallet this week"
 * dead-ended: the planner had no profitability tool to pick and fell back to
 * getMostActiveWallets (activity ≠ profit), which then timed out.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { applyLabel, fetchEntityLabels } from './entityLabels'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25

export interface GetTopPerformingWalletsArgs {
  limit?: unknown
}

export async function run(
  args: GetTopPerformingWalletsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const limitRaw = Number(args.limit)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_LIMIT, Math.round(limitRaw))) : DEFAULT_LIMIT

  try {
    const { data: row, error } = await supabase
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', 'anon_whale_backtests_7d')
      .maybeSingle()
    if (error) {
      return { ok: false, data: null, source: 'app_cache', fetched_at, error: error.message }
    }
    const rows: any[] = Array.isArray(row?.value?.rows) ? row.value.rows : []
    const ranked = rows
      .filter((r) => r && r.error == null && Number(r.trades) > 0 && Number.isFinite(Number(r.return_pct_7d)))
      .sort((a, b) => Number(b.return_pct_7d) - Number(a.return_pct_7d))
      .slice(0, limit)

    if (ranked.length === 0) {
      return { ok: false, data: null, source: 'app_cache', fetched_at, error: 'no_backtest_rows' }
    }

    const labels = await fetchEntityLabels(
      supabase,
      ranked.map((r) => String(r.address))
    ).catch(() => new Map())

    const wallets = ranked.map((r, i) => {
      const address = String(r.address)
      return applyLabel(
        {
          rank: i + 1,
          address,
          address_short: address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-4)}` : address,
          chain: r.chain ?? null,
          return_pct_7d: Math.round(Number(r.return_pct_7d) * 100) / 100,
          trades_7d: Number(r.trades) || 0,
          smart_money_score: Number.isFinite(Number(r.smart_money_score))
            ? Math.round(Number(r.smart_money_score) * 100) / 100
            : null,
        },
        labels
      )
    })

    return {
      ok: true,
      data: {
        window: '7d',
        methodology:
          'Simulated replay of each wallet\'s actual on-chain BUY/SELL fills over the last 7 days from a $10k stake — comparable percentage returns, not raw balance change.',
        computed_at: row?.updated_at ?? null,
        wallets,
      },
      source: 'anon_whale_backtests_7d',
      fetched_at,
    }
  } catch (err: any) {
    return { ok: false, data: null, source: 'app_cache', fetched_at, error: err?.message ?? 'unknown' }
  }
}
