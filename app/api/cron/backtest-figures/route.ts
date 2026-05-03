/**
 * CRON: Nightly backtest of every approved curated figure.
 * Schedule: 04:00 UTC daily (vercel.json).
 *
 * For each `curated_entities` row that has at least one Ethereum / Polygon
 * / Solana address, replays the wallet through the same engine that powers
 * the on-page backtest panel (lib/wallet-backtest/engine.ts) for two
 * windows — 7d and 90d, both starting from $10k of paper capital — and
 * upserts the result into `figure_backtests`.
 *
 * The pre-computed numbers feed:
 *   - /figures "performance" sort
 *   - /wallet-tracker "Top Performers This Week" widget
 * so neither page has to round-trip the engine on a user request.
 *
 * Bias guarantees inherited from the engine: no look-ahead pricing,
 * survivorship-aware (rugged tokens mark to zero), 30bps fee per fill,
 * $25 dust threshold. See lib/wallet-backtest/engine.ts for details.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runBacktest } from '@/lib/wallet-backtest/engine'
import type { BacktestChain } from '@/lib/wallet-backtest/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const CAPITAL_USD = 10_000
const SUPPORTED = new Set<BacktestChain>(['ethereum', 'polygon', 'solana'])

type FigureRow = {
  slug: string
  addresses: Array<{ address?: string; chain?: string }> | null
}

type WindowResult = {
  return_pct: number | null
  final_equity_usd: number | null
  trades: number
  error: string | null
}

async function backtestWindow(
  chain: BacktestChain,
  address: string,
  start_ms: number,
  end_ms: number,
): Promise<WindowResult> {
  // Per-window hard timeout. A handful of high-activity wallets (e.g.
  // a cold-storage wallet with 10k+ ERC-20 transfers across hundreds
  // of unique tokens) blow past Vercel's 300s function cap on the 90d
  // window because we have to fetch a CoinGecko price series per
  // unique token. Cap at 45s/window so the cron always returns.
  const PER_WINDOW_TIMEOUT_MS = 45_000
  try {
    const out = await Promise.race([
      runBacktest({ address, chain, capital_usd: CAPITAL_USD, start_ms, end_ms }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`backtest timed out after ${PER_WINDOW_TIMEOUT_MS / 1000}s`)),
          PER_WINDOW_TIMEOUT_MS,
        ),
      ),
    ])
    return {
      return_pct: Number.isFinite(out.result.total_return_pct) ? out.result.total_return_pct : null,
      final_equity_usd: Number.isFinite(out.result.final_equity_usd) ? out.result.final_equity_usd : null,
      trades: out.trades_count,
      error: null,
    }
  } catch (e: any) {
    return { return_pct: null, final_equity_usd: null, trades: 0, error: String(e?.message || e).slice(0, 500) }
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Wall-clock budget: stop scheduling new figures once we're within
  // 30s of Vercel's 300s function cap. Already-in-flight figures can
  // still finish their writes. The cron is idempotent (upsert on slug)
  // so any unprocessed figures get picked up on the next run — invoke
  // a second time manually with the same secret to drain the rest.
  const startTs = Date.now()
  // Two windows × per_window_timeout (45s) = 90s worst-case per figure.
  // With CONCURRENCY=2 we need ~180s budget to drain 4 figures' tail
  // after we stop scheduling. 200s leaves a 100s safety margin under
  // the 300s Vercel function cap.
  const BUDGET_MS = 200_000

  const url = new URL(request.url)
  // Optional ?slug=foo,bar to backtest a specific subset (admin tool).
  const slugFilter = (url.searchParams.get('slug') || '').trim()
  const onlySlugs = slugFilter
    ? new Set(slugFilter.split(',').map((s) => s.trim()).filter(Boolean))
    : null
  // Optional ?stale_only=1 to skip figures whose figure_backtests row
  // was computed within the last 18h. Used to cheaply drain leftovers
  // without re-running figures that already have fresh numbers.
  const staleOnly = url.searchParams.get('stale_only') === '1'

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: rows, error } = await sb
    .from('curated_entities')
    .select('slug, addresses')
    .eq('submission_status', 'approved')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let figures: FigureRow[] = (rows || []).filter(
    (r: any) => Array.isArray(r.addresses) && r.addresses.length > 0,
  )
  if (onlySlugs) {
    figures = figures.filter((f) => onlySlugs.has(f.slug))
  }
  if (staleOnly) {
    const cutoff = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
    const { data: fresh } = await sb
      .from('figure_backtests')
      .select('slug, computed_at')
      .gt('computed_at', cutoff)
    const freshSet = new Set((fresh || []).map((r: any) => r.slug))
    figures = figures.filter((f) => !freshSet.has(f.slug))
  }

  const now = Date.now()
  const start7d = now - 7 * 24 * 60 * 60 * 1000
  const start90d = now - 90 * 24 * 60 * 60 * 1000

  let processed = 0
  let written = 0
  let skipped = 0
  const errors: Array<{ slug: string; error: string }> = []

  // Process with bounded concurrency. The previous serial loop ran
  // figures back-to-back; once the engine started returning real data
  // (rather than failing instantly on a bad fromBlock) the wall-time
  // for ~20 figures × 2 windows blew past Vercel's 300s function cap.
  // A concurrency of 4 keeps us well under per-provider rate limits
  // (Alchemy 25 cps, CoinGecko Pro 500/min, Helius 10 rps) while
  // collapsing the run to roughly max-per-figure × ceil(N/4).
  const CONCURRENCY = 2
  let cursor = 0
  let budgetExceeded = false
  async function worker() {
    while (true) {
      if (Date.now() - startTs > BUDGET_MS) {
        budgetExceeded = true
        return
      }
      const i = cursor++
      if (i >= figures.length) return
      const fig = figures[i]
      processed++
      const addr = (fig.addresses || []).find((a) =>
        a?.address && a?.chain && SUPPORTED.has(String(a.chain).toLowerCase() as BacktestChain),
      )
      if (!addr) {
        skipped++
        continue
      }
      const chain = String(addr.chain).toLowerCase() as BacktestChain
      const address = String(addr.address)

      const [r90, r7] = await Promise.all([
        backtestWindow(chain, address, start90d, now),
        backtestWindow(chain, address, start7d, now),
      ])

      const upsertErr = await sb
        .from('figure_backtests')
        .upsert(
          {
            slug: fig.slug,
            chain,
            address,
            capital_usd: CAPITAL_USD,
            return_pct_7d: r7.return_pct,
            return_pct_90d: r90.return_pct,
            final_equity_usd_90d: r90.final_equity_usd,
            trades_replayed: r90.trades,
            computed_at: new Date().toISOString(),
            error: r90.error || r7.error,
          },
          { onConflict: 'slug' },
        )
        .then((res) => res.error)

      if (upsertErr) {
        errors.push({ slug: fig.slug, error: upsertErr.message })
      } else {
        written++
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  return NextResponse.json({
    ok: true,
    processed,
    written,
    skipped,
    total_figures: figures.length,
    budget_exceeded: budgetExceeded,
    elapsed_ms: Date.now() - startTs,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
  })
}
