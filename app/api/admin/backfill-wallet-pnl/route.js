import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { estimateRealizedPnl } from '@/lib/wallet-backtest/engine'

// One-time / periodic backfill that recomputes wallet_profiles.pnl_estimated_usd
// as a real, price-aware realized PnL (FIFO over the tracked tape) instead of
// the legacy Σ(sell−buy) figure that mislabeled distribution as profit.
//
// Keyset-paginated by `address` so repeated calls deterministically march
// through the active wallet set:
//   GET /api/admin/backfill-wallet-pnl?secret=...&limit=300
//   GET /api/admin/backfill-wallet-pnl?secret=...&limit=300&after=<next_after>
// Stop when the response has `done: true`.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const BT_CHAINS = ['ethereum', 'polygon', 'solana']

function isAuthed(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // local/dev with no secret configured
  const url = new URL(req.url)
  const qs = url.searchParams.get('secret')
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}` || qs === secret
}

export async function GET(req) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '300', 10)), 1000)
  const after = url.searchParams.get('after') || ''
  const minTx = Math.max(0, parseInt(url.searchParams.get('min_tx') || '10', 10))
  const concurrency = Math.min(Math.max(1, parseInt(url.searchParams.get('concurrency') || '4', 10)), 8)

  let q = supabaseAdmin
    .from('wallet_profiles')
    .select('address, chain, tx_count_30d')
    .in('chain', BT_CHAINS)
    .gte('tx_count_30d', minTx)
    .order('address', { ascending: true })
    .limit(limit)
  if (after) q = q.gt('address', after)

  const { data: wallets, error } = await q
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!wallets || wallets.length === 0) {
    return NextResponse.json({ done: true, processed: 0, updated: 0, next_after: null })
  }

  let updated = 0
  let nulled = 0
  const errors = []
  let cursor = 0

  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= wallets.length) return
      const w = wallets[i]
      try {
        const rp = await estimateRealizedPnl({ address: w.address, chain: w.chain })
        const val = Number.isFinite(rp?.realized_pnl_usd)
          ? Math.round(rp.realized_pnl_usd * 100) / 100
          : null
        const { error: upErr } = await supabaseAdmin
          .from('wallet_profiles')
          .update({ pnl_estimated_usd: val })
          .eq('address', w.address)
        if (upErr) errors.push(`${w.address}: ${upErr.message}`)
        else { updated++; if (val == null) nulled++ }
      } catch (e) {
        errors.push(`${w.address}: ${String(e?.message || e).slice(0, 120)}`)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, wallets.length) }, worker)
  )

  return NextResponse.json({
    done: wallets.length < limit,
    processed: wallets.length,
    updated,
    nulled,
    next_after: wallets[wallets.length - 1].address,
    errors: errors.slice(0, 10),
  })
}
