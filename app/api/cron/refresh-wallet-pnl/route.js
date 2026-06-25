import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { estimateRealizedPnl } from '@/lib/wallet-backtest/engine'

// Daily refresh of wallet_profiles.pnl_estimated_usd (the realized PnL shown
// on the leaderboard + compare page). This is price-aware/expensive so it's
// intentionally NOT in the hourly refresh-wallets cron — it's done once a day
// here, and computed live on the per-wallet page. Walks every active EVM/Solana
// wallet (keyset-paginated by address) within the function time budget.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const BT_CHAINS = ['ethereum', 'polygon', 'solana']
const PAGE = 250
const CONCURRENCY = 8
const DEADLINE_MS = 270_000 // stop cleanly before Vercel's 300s hard cap

function isAuthed(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const url = new URL(req.url)
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}` || url.searchParams.get('secret') === secret
}

export async function GET(req) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const minTx = Math.max(0, parseInt(new URL(req.url).searchParams.get('min_tx') || '10', 10))

  let after = ''
  let processed = 0
  let updated = 0
  let nulled = 0
  let pages = 0
  let done = false
  const errors = []

  while (Date.now() - t0 < DEADLINE_MS) {
    let q = supabaseAdmin
      .from('wallet_profiles')
      .select('address, chain')
      .in('chain', BT_CHAINS)
      .gte('tx_count_30d', minTx)
      .order('address', { ascending: true })
      .limit(PAGE)
    if (after) q = q.gt('address', after)

    const { data: wallets, error } = await q
    if (error) {
      errors.push(error.message)
      break
    }
    if (!wallets || wallets.length === 0) {
      done = true
      break
    }

    let cursor = 0
    async function worker() {
      while (true) {
        const i = cursor++
        if (i >= wallets.length) return
        if (Date.now() - t0 >= DEADLINE_MS) return
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
          else {
            updated++
            if (val == null) nulled++
          }
        } catch (e) {
          errors.push(`${w.address}: ${String(e?.message || e).slice(0, 100)}`)
        }
        processed++
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, wallets.length) }, worker))

    after = wallets[wallets.length - 1].address
    pages += 1
    if (wallets.length < PAGE) {
      done = true
      break
    }
  }

  return NextResponse.json({
    ok: true,
    done,
    processed,
    updated,
    nulled,
    pages,
    last_address: after || null,
    elapsed_ms: Date.now() - t0,
    errors: errors.slice(0, 10),
  })
}
