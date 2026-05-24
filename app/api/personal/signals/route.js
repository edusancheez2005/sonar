/**
 * GET /api/personal/signals
 * =============================================================================
 * Returns the authenticated user's personalised signal feed, filtered by
 * their `user_profile.risk_tolerance` + `time_horizon` and scoped to the
 * tickers in their holdings + watchlist.
 *
 * Reads:  user_profile, user_holdings, user_watchlist, token_signals
 *         (the public production table — NOT signal_research_results).
 *
 * Auth:   requires a Supabase user JWT (Authorization: Bearer <token>).
 *         JWT is verified via the anon client before any service-role read.
 *
 * Response shape:
 *   { items: FilteredSignal[], profile_applied: {...}, fetched_at: string }
 *
 * Cache:  private, no-store — this is per-user.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getUserTickers } from '@/lib/personal/watchlist'
import { filterPersonalSignals } from '@/lib/personal/signals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOOKBACK_HOURS = 48
const RAW_SIGNAL_LIMIT = 200

export async function GET(request) {
  try {
    const auth = request.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : null
    if (!token) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const anonUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!anonUrl || !anonKey) {
      return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
    }
    const anon = createClient(anonUrl, anonKey, {
      auth: { persistSession: false },
    })
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const userId = userData.user.id

    // Profile (filter knobs)
    const { data: profileRow } = await supabaseAdmin
      .from('user_profile')
      .select('risk_tolerance, time_horizon')
      .eq('user_id', userId)
      .maybeSingle()

    const profile = {
      risk_tolerance: profileRow?.risk_tolerance ?? null,
      time_horizon: profileRow?.time_horizon ?? null,
    }

    // Ticker set
    const tickerRows = await getUserTickers(userId, supabaseAdmin)
    const tickers = tickerRows.map((r) => r.ticker)
    if (tickers.length === 0) {
      return NextResponse.json(
        {
          items: [],
          profile_applied: profile,
          empty_reason: 'no_tickers',
          fetched_at: new Date().toISOString(),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    // Raw signal pull. We over-fetch then filter in process; the dataset
    // size is bounded by RAW_SIGNAL_LIMIT and the user's ticker set.
    const sinceIso = new Date(
      Date.now() - LOOKBACK_HOURS * 3600 * 1000,
    ).toISOString()
    const { data: rawRows, error: signalsErr } = await supabaseAdmin
      .from('token_signals')
      .select('id, token, signal, score, confidence, timeframe, price_at_signal, computed_at')
      .in('token', tickers)
      .gte('computed_at', sinceIso)
      .order('computed_at', { ascending: false })
      .limit(RAW_SIGNAL_LIMIT)

    if (signalsErr) {
      console.error('[api/personal/signals] read failure', signalsErr)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    const items = filterPersonalSignals(rawRows || [], profile)

    return NextResponse.json(
      {
        items,
        profile_applied: profile,
        fetched_at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (err) {
    console.error('[api/personal/signals] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
