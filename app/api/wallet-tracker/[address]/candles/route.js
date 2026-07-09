import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { cached } from '@/app/lib/serverCache'

// Daily OHLC candles of a wallet's cumulative net USD flow, derived from
// the merged transaction feed — the same construction the figure detail
// page uses (app/figure/[slug]/page.js buildPortfolioCandles), so the
// Research terminal and figure pages always agree. Inflows (wallet
// receiving / BUY) push the curve up; outflows (sending / SELL) push it
// down. Each day also carries its absolute USD volume for the chart's
// volume sub-pane. This is an on-chain flow curve, NOT a holdings
// valuation — the client labels it as such.

const MAX_DAYS = 365
const MAX_ROWS = 4000

export async function GET(req, { params }) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { address } = await params
  if (!address || address.length < 8 || address.length > 90) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '90', 10)
  const days = Math.min(Math.max(7, Number.isFinite(daysRaw) ? daysRaw : 90), MAX_DAYS)

  try {
    const payload = await cached(
      `candles:${address}:${days}`,
      () => buildCandles(address, days),
      { ttl: 120000, swr: 300000 }
    )
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' },
    })
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'candles failed' }, { status: 500 })
  }
}

async function buildCandles(address, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Preferred: exact per-day net flow from the database (no 1,000-row cap, and
  // a single classification-based sign convention that matches the leaderboard
  // — the old inline path mixed transfer-direction with classification and
  // produced a different Net Flow number). See 20260709_exact_aggregates.sql.
  try {
    const { data: daily, error } = await supabaseAdmin.rpc('wallet_daily_flows', {
      p_address: address,
      p_since: since,
    })
    if (error) throw new Error(error.message)
    if (Array.isArray(daily)) {
      let cumulative = 0
      let txCount = 0
      const candles = daily.map((row) => {
        const net = Number(row.net_usd) || 0
        const o = cumulative
        cumulative += net
        txCount += Number(row.tx_count) || 0
        return {
          t: Date.parse(row.day),
          o: Math.round(o),
          h: Math.round(Math.max(o, cumulative)),
          l: Math.round(Math.min(o, cumulative)),
          c: Math.round(cumulative),
          v: Math.round(Number(row.volume) || 0),
        }
      })
      return { data: candles, net_flow_usd: Math.round(cumulative), tx_count: txCount, days }
    }
  } catch (err) {
    console.warn('[candles] RPC wallet_daily_flows failed, using legacy path:', err?.message)
  }

  return await buildCandlesLegacy(address, days, since)
}

// Legacy row-scan (fallback if the aggregate migration hasn't run). Capped at
// MAX_ROWS by PostgREST — kept only so the chart still renders pre-migration.
async function buildCandlesLegacy(address, days, since) {
  const COLS = 'timestamp, usd_value, classification, from_address, to_address'

  let { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select(COLS)
    .eq('whale_address', address)
    .gte('timestamp', since)
    .order('timestamp', { ascending: true })
    .limit(MAX_ROWS)

  // Same fallback as the transactions route: some wallets only appear as
  // counterparties (from_address) rather than the indexed whale_address.
  if (!error && (!data || data.length === 0)) {
    const fb = await supabaseAdmin
      .from('all_whale_transactions')
      .select(COLS)
      .or(`from_address.eq.${address},to_address.eq.${address}`)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true })
      .limit(MAX_ROWS)
    if (!fb.error && fb.data?.length > 0) data = fb.data
    else if (fb.error) error = fb.error
  }

  if (error) {
    throw new Error(error.message)
  }

  // Signed deltas → daily OHLC of the cumulative curve.
  const byDay = new Map()
  let cumulative = 0
  let txCount = 0
  for (const tx of data || []) {
    const usd = Number(tx.usd_value)
    if (!Number.isFinite(usd) || usd === 0) continue
    let sign = 0
    const c = String(tx.classification || '').toLowerCase()
    if (c === 'buy') sign = 1
    else if (c === 'sell') sign = -1
    else if (tx.to_address === address) sign = 1
    else if (tx.from_address === address) sign = -1
    if (sign === 0) continue
    txCount += 1
    const day = String(tx.timestamp).slice(0, 10)
    let rec = byDay.get(day)
    if (!rec) {
      rec = { day, o: cumulative, h: cumulative, l: cumulative, c: cumulative, v: 0 }
      byDay.set(day, rec)
    }
    cumulative += sign * usd
    rec.c = cumulative
    if (cumulative > rec.h) rec.h = cumulative
    if (cumulative < rec.l) rec.l = cumulative
    rec.v += Math.abs(usd)
  }

  const candles = Array.from(byDay.values()).map((r) => ({
    t: Date.parse(r.day),
    o: Math.round(r.o),
    h: Math.round(r.h),
    l: Math.round(r.l),
    c: Math.round(r.c),
    v: Math.round(r.v),
  }))

  return { data: candles, net_flow_usd: Math.round(cumulative), tx_count: txCount, days }
}
