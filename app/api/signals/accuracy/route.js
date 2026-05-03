/**
 * GET /api/signals/accuracy
 * 
 * Returns signal accuracy statistics:
 *   - Overall hit rate (% of correct predictions)
 *   - Per-window accuracy (1h, 6h, 24h)
 *   - Per-signal-type accuracy (BUY, STRONG_BUY, SELL, STRONG_SELL)
 *   - Per-token accuracy (top tokens by sample size)
 *   - Average price change for correct vs incorrect signals
 *   - Recent outcomes (last 50)
 * 
 * Query params:
 *   - token: Filter by specific token (optional)
 *   - days: Lookback period in days (default: 30)
 */

import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { NOISE_FLOOR_PCT, MIN_N_FOR_TRUST, ROUND_TRIP_BPS } from '@/lib/quant/constants'

export const dynamic = 'force-dynamic'

// Noise floor + trust threshold + round-trip cost are imported from
// lib/quant/constants.ts (single source of truth across the codebase).

// API-1 (2026-05-01): /api/signals mutes BUY/STRONG BUY at the boundary.
// The accuracy API used to include them anyway, which broke symmetry — a
// user reading /api/signals/accuracy could see a 0% BUY hit-rate they could
// not reproduce by inspecting /api/signals output. By default we now mirror
// the same mute on the read side. Pass ?include_muted=true to see all rows
// (used by ops/audits).
const HIDE_BULLISH_SIGNALS = true
const BULLISH_TYPES = new Set(['BUY', 'STRONG BUY'])

/**
 * Two-sided binomial p-value vs a fair-coin null (p=0.5).
 * Uses a normal approximation with continuity correction — fine for n >= 30,
 * which is exactly where we'd care about the value.
 * Returns null if n is too small to be meaningful.
 */
function binomialPValueVs50(k, n) {
  if (!n || n < 10) return null
  const p0 = 0.5
  const mean = n * p0
  const sd = Math.sqrt(n * p0 * (1 - p0))
  if (sd === 0) return null
  // continuity correction
  const z = (Math.abs(k - mean) - 0.5) / sd
  // two-sided p = 2 * (1 - Phi(z))
  // Abramowitz & Stegun 26.2.17 for 1-Phi(z)
  const t = 1 / (1 + 0.2316419 * z)
  const d = 0.3989422804014327 * Math.exp(-z * z / 2)
  const oneMinusPhi = d * (
    0.319381530 * t
    - 0.356563782 * t * t
    + 1.781477937 * t * t * t
    - 1.821255978 * t * t * t * t
    + 1.330274429 * t * t * t * t * t
  )
  const p = 2 * Math.max(0, Math.min(0.5, oneMinusPhi))
  return Math.round(p * 1e6) / 1e6
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')?.toUpperCase()
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const includeMuted = searchParams.get('include_muted') === 'true'

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all outcomes in the lookback period
    let query = supabaseAdmin
      .from('signal_outcomes')
      .select('*')
      .gte('signal_time', since)
      .not('correct', 'is', null)
      .order('eval_time', { ascending: false })

    if (token) query = query.eq('token', token)

    const { data: rawOutcomes, error } = await query.limit(5000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Belt-and-suspenders noise filter (the cron now writes correct=null for
    // sub-noise moves, but historical rows pre-fix may still need filtering).
    const outcomes = (rawOutcomes || []).filter(
      o => Math.abs(Number(o.price_change_pct)) >= NOISE_FLOOR_PCT
    ).filter(
      // API-1: mirror the /api/signals BUY mute unless explicitly overridden.
      o => includeMuted || !HIDE_BULLISH_SIGNALS || !BULLISH_TYPES.has(o.signal_type)
    )

    const disclaimers = [
      `Outcomes with |price change| < ${NOISE_FLOOR_PCT}% (data-feed gaps / sub-fee noise) are excluded.`,
      'Directional accuracy only — no benchmark, no transaction costs, no slippage.',
      'Past performance does not guarantee future results.',
      `Per-token accuracy with n < ${MIN_N_FOR_TRUST} is statistically unreliable and is flagged as low_confidence.`,
    ]

    if (!outcomes || outcomes.length === 0) {
      return NextResponse.json({
        message: 'No signal outcomes yet. Signals need time to be evaluated (1h, 6h, 24h windows).',
        overall: { total: 0, correct: 0, accuracy: 0, p_value: null },
        by_window: {},
        by_signal_type: {},
        by_token: {},
        disclaimers,
        recent: [],
      })
    }

    // Overall accuracy
    const total = outcomes.length
    const correct = outcomes.filter(o => o.correct).length
    const accuracy = Math.round((correct / total) * 1000) / 10
    const overallP = binomialPValueVs50(correct, total)

    // Per-window accuracy
    const byWindow = {}
    for (const w of ['1h', '6h', '24h']) {
      const wOutcomes = outcomes.filter(o => o.eval_window === w)
      const wCorrect = wOutcomes.filter(o => o.correct).length
      byWindow[w] = {
        total: wOutcomes.length,
        correct: wCorrect,
        accuracy: wOutcomes.length > 0 ? Math.round((wCorrect / wOutcomes.length) * 1000) / 10 : 0,
        p_value: binomialPValueVs50(wCorrect, wOutcomes.length),
        avg_price_change: wOutcomes.length > 0
          ? Math.round(wOutcomes.reduce((s, o) => s + o.price_change_pct, 0) / wOutcomes.length * 100) / 100
          : 0,
      }
    }

    // Per-signal-type accuracy
    const byType = {}
    for (const t of ['STRONG BUY', 'BUY', 'SELL', 'STRONG SELL']) {
      const tOutcomes = outcomes.filter(o => o.signal_type === t)
      const tCorrect = tOutcomes.filter(o => o.correct).length
      byType[t] = {
        total: tOutcomes.length,
        correct: tCorrect,
        accuracy: tOutcomes.length > 0 ? Math.round((tCorrect / tOutcomes.length) * 1000) / 10 : 0,
        p_value: binomialPValueVs50(tCorrect, tOutcomes.length),
        avg_price_change: tOutcomes.length > 0
          ? Math.round(tOutcomes.reduce((s, o) => s + o.price_change_pct, 0) / tOutcomes.length * 100) / 100
          : 0,
      }
    }

    // Per-token accuracy (top 20 by sample size). Flag low-n rows so the UI
    // can de-emphasize "100%" vanity stats from tiny samples.
    const tokenMap = new Map()
    for (const o of outcomes) {
      if (!tokenMap.has(o.token)) tokenMap.set(o.token, { total: 0, correct: 0, sumChange: 0 })
      const t = tokenMap.get(o.token)
      t.total++
      if (o.correct) t.correct++
      t.sumChange += o.price_change_pct
    }
    const byToken = Object.fromEntries(
      [...tokenMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([tok, v]) => [tok, {
          total: v.total,
          correct: v.correct,
          accuracy: Math.round((v.correct / v.total) * 1000) / 10,
          avg_price_change: Math.round((v.sumChange / v.total) * 100) / 100,
          low_confidence: v.total < MIN_N_FOR_TRUST,
        }])
    )

    // Correct vs incorrect average price change
    const correctOutcomes = outcomes.filter(o => o.correct)
    const incorrectOutcomes = outcomes.filter(o => !o.correct)
    const avgCorrectChange = correctOutcomes.length > 0
      ? Math.round(correctOutcomes.reduce((s, o) => s + Math.abs(o.price_change_pct), 0) / correctOutcomes.length * 100) / 100
      : 0
    const avgIncorrectChange = incorrectOutcomes.length > 0
      ? Math.round(incorrectOutcomes.reduce((s, o) => s + Math.abs(o.price_change_pct), 0) / incorrectOutcomes.length * 100) / 100
      : 0

    // ─── Real quant blocks ────────────────────────────────────────────────
    // Treat each non-NEUTRAL signal as a single round-trip trade in its
    // direction. Signed return = +price_change_pct for bullish signals,
    // -price_change_pct for bearish signals. This is the realised PnL of
    // a 1-unit, equal-weight, fees-naive strategy that closes at eval_time.
    // (ROUND_TRIP_BPS imported from lib/quant/constants.ts)
    const signed = (o) => {
      const isBullish = o.signal_type === 'STRONG BUY' || o.signal_type === 'BUY'
      return isBullish ? Number(o.price_change_pct) : -Number(o.price_change_pct)
    }
    const signedReturns = outcomes.map(signed)
    const grossPnl = signedReturns.length
      ? signedReturns.reduce((s, x) => s + x, 0) / signedReturns.length
      : 0
    const netPnl = grossPnl - ROUND_TRIP_BPS / 100

    // Alpha (vs BTC) — only over outcomes where we have a benchmark price.
    const withAlpha = outcomes.filter(o => o.alpha_pct !== null && o.alpha_pct !== undefined)
    const beatBench = withAlpha.filter(o => o.beat_benchmark === true).length
    const benchmarkPctBeat = withAlpha.length
      ? Math.round((beatBench / withAlpha.length) * 1000) / 10
      : null
    const signedAlpha = withAlpha.map(o => {
      const isBullish = o.signal_type === 'STRONG BUY' || o.signal_type === 'BUY'
      return isBullish ? Number(o.alpha_pct) : -Number(o.alpha_pct)
    })
    const meanAlpha = signedAlpha.length
      ? signedAlpha.reduce((s, x) => s + x, 0) / signedAlpha.length
      : null
    let stdAlpha = null
    if (signedAlpha.length > 1 && meanAlpha !== null) {
      const variance = signedAlpha.reduce((s, x) => s + (x - meanAlpha) ** 2, 0) / (signedAlpha.length - 1)
      stdAlpha = Math.sqrt(variance)
    }
    const sharpeLike = (stdAlpha && stdAlpha > 0 && meanAlpha !== null)
      ? meanAlpha / stdAlpha
      : null

    const round2 = (x) => x === null || x === undefined ? null : Math.round(x * 100) / 100
    const round4 = (x) => x === null || x === undefined ? null : Math.round(x * 1e4) / 1e4

    // HEALTH-1 (2026-05-01): freshness block. Reads the latest row per
    // component from `v_system_health_latest`. Surfaces upstream pipeline
    // staleness directly to anything that consumes the accuracy endpoint
    // (operator dashboards, the public stats page) so a frozen
    // fetch-prices is impossible to miss.
    let freshness = null
    try {
      const { data: healthRows } = await supabaseAdmin
        .from('v_system_health_latest')
        .select('component, status, finished_at, duration_ms, details')
      if (healthRows) {
        const nowMs = Date.now()
        freshness = {
          components: healthRows.map(r => {
            const ageSec = r.finished_at
              ? Math.floor((nowMs - new Date(r.finished_at).getTime()) / 1000)
              : null
            return {
              component: r.component,
              status: r.status,
              finished_at: r.finished_at,
              age_seconds: ageSec,
              stale: ageSec !== null && ageSec > 30 * 60, // >30min = stale
              duration_ms: r.duration_ms,
            }
          }),
          checked_at: new Date(nowMs).toISOString(),
        }
        freshness.any_stale = freshness.components.some(c => c.stale || c.status === 'error')
      }
    } catch (e) {
      // system_health table may not exist yet (migration unapplied).
      // Don't fail the whole accuracy endpoint over a missing table.
      freshness = { error: 'system_health unavailable', detail: e?.message }
    }

    // Recent outcomes
    const recent = outcomes.slice(0, 50).map(o => ({
      token: o.token,
      signal: o.signal_type,
      score: o.signal_score,
      window: o.eval_window,
      price_at_signal: o.price_at_signal,
      price_at_eval: o.price_at_eval,
      change_pct: o.price_change_pct,
      btc_change_pct: o.btc_change_pct ?? null,
      alpha_pct: o.alpha_pct ?? null,
      beat_benchmark: o.beat_benchmark ?? null,
      correct: o.correct,
      signal_time: o.signal_time,
      eval_time: o.eval_time,
    }))

    return NextResponse.json({
      period_days: days,
      include_muted: includeMuted,
      signal_visibility: {
        bullish_muted: HIDE_BULLISH_SIGNALS && !includeMuted,
        note: HIDE_BULLISH_SIGNALS && !includeMuted
          ? 'BUY/STRONG BUY excluded by default to mirror /api/signals. Pass ?include_muted=true to see all signal types.'
          : null,
      },
      freshness,
      overall: { total, correct, accuracy, p_value: overallP },
      by_window: byWindow,
      by_signal_type: byType,
      by_token: byToken,
      performance: {
        avg_correct_move: avgCorrectChange,
        avg_incorrect_move: avgIncorrectChange,
        edge: Math.round((avgCorrectChange - avgIncorrectChange) * 100) / 100,
        edge_caveat: 'Magnitude-of-move differential, NOT realised PnL. Does not account for benchmark drift, fees, or slippage. Treat as descriptive only.',
      },
      pnl: {
        gross_pnl_per_trade_pct: round4(grossPnl),
        net_pnl_per_trade_pct: round4(netPnl),
        round_trip_cost_bps: ROUND_TRIP_BPS,
        sample_size: signedReturns.length,
        sample_size_warning: signedReturns.length < MIN_N_FOR_TRUST,
        method: 'Mean signed % return per signal, treating each non-NEUTRAL signal as a 1-unit equal-weight trade closed at the eval window. Net subtracts a flat 30 bps round-trip cost.',
      },
      vs_benchmark: {
        sample_size: withAlpha.length,
        sample_size_warning: withAlpha.length < MIN_N_FOR_TRUST,
        pct_beat_btc: benchmarkPctBeat,
        mean_alpha_pct: round4(meanAlpha),
        stdev_alpha_pct: round4(stdAlpha),
        sharpe_like: round2(sharpeLike),
        sharpe_caveat: 'Per-signal mean(alpha)/stdev(alpha). NOT annualised. Requires n >= 30 to be meaningful.',
      },
      disclaimers,
      recent,
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    console.error('Signal accuracy API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
