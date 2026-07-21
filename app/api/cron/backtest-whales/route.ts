/**
 * CRON: Nightly backtest of the top anonymous smart-money wallets.
 * Schedule: 30 04 * * * (vercel.json) — after backtest-figures.
 *
 * The curated figures are mostly institutions whose wallets don't DEX-trade,
 * so their backtests are flat and the weekly Whale Pulse often has nothing
 * to show. The wallets actually making money are the anonymous traders on
 * the smart-money leaderboard (wallet_profiles). This cron replays the top
 * N of them through the same engine (7d window, $10k paper capital) and
 * stashes the ranked results in app_cache under ANON_WHALES_CACHE_KEY for
 * the weekly email + widgets to read. No new table needed.
 *
 * figure_backtests can't hold these rows — its slug column is a FK to
 * curated_entities — and anon wallets don't belong in the public figures
 * directory anyway.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runBacktest } from '@/lib/wallet-backtest/engine'
import type { BacktestChain } from '@/lib/wallet-backtest/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300
// Avoid the Next Data Cache pinning Supabase GETs (see backtest-figures).
export const fetchCache = 'force-no-store'

// Read by app/api/cron/weekly-top-wallets (keep the two in sync — route
// files can't export arbitrary constants under Next's route type checking).
const ANON_WHALES_CACHE_KEY = 'anon_whale_backtests_7d'

const CAPITAL_USD = 10_000
const CANDIDATES = 30
const PER_WINDOW_TIMEOUT_MS = 45_000
const BUDGET_MS = 240_000
const RETURN_CLAMP_PCT = 50_000

type WhaleRow = {
  address: string
  chain: BacktestChain
  smart_money_score: number | null
  return_pct_7d: number | null
  final_equity_usd: number | null
  trades: number
  error: string | null
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const startTs = Date.now()

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  // Top active traders by smart-money score. Solana rows whose addresses were
  // lowercased at ingestion can't be replayed on-chain (base58 is
  // case-sensitive), but the engine's primary source is the stored Supabase
  // tape keyed by that same stored address, so they replay fine.
  const { data: rows, error } = await sb
    .from('wallet_profiles')
    .select('address, chain, smart_money_score')
    .gte('tx_count_30d', 10)
    .in('chain', ['ethereum', 'polygon', 'solana'])
    .order('smart_money_score', { ascending: false, nullsFirst: false })
    .limit(CANDIDATES)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const start7d = now - 7 * 24 * 60 * 60 * 1000

  const results: WhaleRow[] = []
  const queue = [...(rows || [])]
  let budgetExceeded = false

  async function worker() {
    while (true) {
      if (Date.now() - startTs > BUDGET_MS) { budgetExceeded = true; return }
      const w = queue.shift()
      if (!w) return
      const chain = String(w.chain).toLowerCase() as BacktestChain
      try {
        const out = await Promise.race([
          runBacktest({ address: w.address, chain, capital_usd: CAPITAL_USD, start_ms: start7d, end_ms: now }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`timeout ${PER_WINDOW_TIMEOUT_MS / 1000}s`)), PER_WINDOW_TIMEOUT_MS),
          ),
        ])
        const ret = out.result.total_return_pct
        const sane = Number.isFinite(ret) && Math.abs(ret) <= RETURN_CLAMP_PCT
        results.push({
          address: w.address,
          chain,
          smart_money_score: w.smart_money_score != null ? Number(w.smart_money_score) : null,
          return_pct_7d: sane ? ret : null,
          final_equity_usd: sane && Number.isFinite(out.result.final_equity_usd) ? out.result.final_equity_usd : null,
          trades: out.trades_count,
          error: sane ? null : `clamped: |return| > ${RETURN_CLAMP_PCT}%`,
        })
      } catch (e: any) {
        results.push({
          address: w.address, chain,
          smart_money_score: w.smart_money_score != null ? Number(w.smart_money_score) : null,
          return_pct_7d: null, final_equity_usd: null, trades: 0,
          error: String(e?.message || e).slice(0, 200),
        })
      }
    }
  }
  await Promise.all(Array.from({ length: 2 }, () => worker()))

  results.sort((a, b) => (b.return_pct_7d ?? -Infinity) - (a.return_pct_7d ?? -Infinity))

  const value = {
    computed_at: new Date().toISOString(),
    window: '7d',
    capital_usd: CAPITAL_USD,
    candidates: (rows || []).length,
    backtested: results.length,
    rows: results,
  }
  const { error: upsertErr } = await sb
    .from('app_cache')
    .upsert({ key: ANON_WHALES_CACHE_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    backtested: results.length,
    positive: results.filter((r) => (r.return_pct_7d ?? 0) > 0).length,
    budget_exceeded: budgetExceeded,
    elapsed_ms: Date.now() - startTs,
    top: results.slice(0, 5).map((r) => ({ address: r.address, return_pct_7d: r.return_pct_7d, trades: r.trades })),
  })
}
