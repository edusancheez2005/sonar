/**
 * GET /api/frontier/accuracy
 *
 * Returns the live accuracy proof strip footer of /frontier:
 *   - BUY family accuracy + n  (24h)
 *   - SELL family accuracy + n (24h)
 *   - Per-direction circuit-breaker state from signal_circuit_breaker
 *   - Watchdog last-tick relative time (most recent accuracy_baseline row)
 *
 * Mirrors the math in /api/cron/accuracy-watchdog: ignores correct=null
 * (noise-floor skips) and NEUTRAL outcomes (no directional view), and
 * collapses 'BUY' + 'STRONG BUY' into the BUY family (same for SELL).
 *
 * Solana-specific scoping is intentionally NOT applied yet — the
 * signal_outcomes table doesn't carry chain attribution. The UI labels
 * the strip as "Sonar engine accuracy (24h)" so the claim is honest.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isAuthorized } from '@/app/api/frontier/_auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const LOOKBACK_HOURS = 24

function isBuyFamily(t) {
  return t === 'BUY' || t === 'STRONG BUY'
}
function isSellFamily(t) {
  return t === 'SELL' || t === 'STRONG SELL'
}

function pctOf(rows, predicate) {
  const filtered = rows.filter((r) => r.correct !== null && predicate(r.signal_type))
  if (!filtered.length) return { pct: null, n: 0 }
  const correct = filtered.filter((r) => r.correct === true).length
  return { pct: (correct / filtered.length) * 100, n: filtered.length }
}

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  // Pull the resolved 24h window + breaker state + last watchdog tick in
  // parallel. accuracy_baseline is optional — if the table or row is
  // missing the strip falls back to "—" without erroring.
  const [outcomesRes, breakerRes, baselineRes] = await Promise.all([
    supabaseAdmin
      .from('signal_outcomes')
      .select('signal_type, correct, signal_time')
      .gte('signal_time', since)
      .limit(20000),
    supabaseAdmin
      .from('signal_circuit_breaker')
      .select('signal_type, active, acc_pct, sample_size, reason, triggered_at'),
    supabaseAdmin
      .from('accuracy_baseline')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  if (outcomesRes.error) {
    return NextResponse.json({ error: outcomesRes.error.message }, { status: 500 })
  }

  const rows = outcomesRes.data || []
  const buy = pctOf(rows, isBuyFamily)
  const sell = pctOf(rows, isSellFamily)

  const breakers = (breakerRes.data || []).map((b) => ({
    signalType: b.signal_type,
    active: b.active,
    accPct: b.acc_pct,
    sampleSize: b.sample_size,
    reason: b.reason,
    triggeredAt: b.triggered_at,
  }))

  // breakerState rollup: 'all_active' | 'tripped' | 'unknown'
  let breakerState = 'unknown'
  if (breakers.length > 0) {
    const anyTripped = breakers.some((b) => b.active === false)
    breakerState = anyTripped ? 'tripped' : 'all_active'
  }

  const watchdogLastTick = baselineRes?.data?.[0]?.created_at || null

  return NextResponse.json(
    {
      lookbackHours: LOOKBACK_HOURS,
      buy,    // { pct, n }
      sell,   // { pct, n }
      breakerState,
      breakers,
      watchdogLastTick,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
  )
}
