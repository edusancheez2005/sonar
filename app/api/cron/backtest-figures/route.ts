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
  try {
    const out = await runBacktest({ address, chain, capital_usd: CAPITAL_USD, start_ms, end_ms })
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

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: rows, error } = await sb
    .from('curated_entities')
    .select('slug, addresses')
    .eq('submission_status', 'approved')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const figures: FigureRow[] = (rows || []).filter(
    (r: any) => Array.isArray(r.addresses) && r.addresses.length > 0,
  )

  const now = Date.now()
  const start7d = now - 7 * 24 * 60 * 60 * 1000
  const start90d = now - 90 * 24 * 60 * 60 * 1000

  let processed = 0
  let written = 0
  let skipped = 0
  const errors: Array<{ slug: string; error: string }> = []

  // Process serially. The engine fans out to Alchemy/Helius/CoinGecko
  // per call and the in-memory price cache only helps within a single
  // process; running serially keeps us well under the per-provider rate
  // limits during the nightly window.
  for (const fig of figures) {
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

  return NextResponse.json({
    ok: true,
    processed,
    written,
    skipped,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
  })
}
