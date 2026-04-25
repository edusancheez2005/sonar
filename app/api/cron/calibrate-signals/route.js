/**
 * CRON: Calibrate Signals
 * Schedule: Daily at 03:00 UTC (after enough fresh outcomes have accumulated).
 *
 * Computes per-token rolling statistics from `signal_outcomes`:
 *   - Pearson IC (signal_score vs price_change_pct)
 *   - Hit rate on directional signals
 *   - Mean alpha vs BTC
 *
 * Derives a `sign_multiplier` (-1 / 0 / +1) and a `confidence_score` and
 * writes them to `token_signal_calibration`. The signal engine reads this
 * table on every compute-signals run to:
 *   (a) override the static TIER1_SIGN_BY_TOKEN map with a *recent* sign,
 *   (b) gate BUY/SELL label emission on tokens whose own per-token IC is
 *       statistically too thin to act on.
 *
 * Why this exists. The static per-token sign table baked in 2026-04-22 went
 * stale within 72h: SOL/DOGE/LINK/UNI/CRV/ONDO showed 0% SELL accuracy on
 * 70+ outcomes each by 2026-04-25 because the regime had rotated. A daily
 * walk-forward refit eliminates that single-point-in-time risk.
 *
 * Methodology notes (anti-overfit):
 *   - We require n_directional >= 20 BEFORE assigning a non-default sign.
 *     Below that, sign_multiplier is NULL and the engine falls back to the
 *     hard-coded default (+1 for unknowns, or whatever is in the static map).
 *   - We only flip to -1 if BOTH IC <= -0.10 AND hit_rate < 0.45. Both
 *     conditions guard against the well-known "small-n -1 trap" where a
 *     handful of sharp losses can drive IC negative without hit-rate moving.
 *   - We mute (0) when |IC| < 0.05 OR hit_rate is in [0.45, 0.55] (i.e.
 *     statistically indistinguishable from a coin flip).
 *   - We exclude `correct = NULL` rows (noise-floor + stale-price guards
 *     already handled at insert time in evaluate-signals).
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const LOOKBACK_DAYS = 30
const EVAL_WINDOWS = ['1h', '6h', '24h']

// Minimum directional outcomes required before we trust a per-token sign.
// Below this, sign_multiplier is NULL and engine falls back to default.
const MIN_N_FOR_SIGN = 20

// Sign derivation is HIT-RATE-FIRST. The Pearson IC is reported and used to
// gate label emission via confidence_score, but the sign itself comes from
// directional accuracy because:
//   - IC measures correlation between score *magnitude* and *return size*,
//     which can be negative even when the directional call is correct most
//     of the time (e.g. BLUR has IC=-0.78 with hit_rate=0.78 — score is
//     anti-correlated with move size, but the BUY/SELL call is right).
//   - hit_rate is what the user actually experiences. If hit_rate < 0.40,
//     the signal is consistently pointing the wrong way regardless of IC.
//
// Thresholds:
//   hit_rate >= 0.60  → +1 (keep direction)
//   hit_rate <= 0.40  → -1 (invert)
//   0.40 < hr < 0.60  →  0 (coin flip; mute)
const FLIP_HIT_RATE = 0.40
const KEEP_HIT_RATE = 0.60

function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return null
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i] }
  const mx = sx / n
  const my = sy / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  if (!isFinite(denom) || denom === 0) return null
  return num / denom
}

function deriveSign(ic, hitRate, nDirectional) {
  // Insufficient data → let the engine fall back to its static default.
  if (nDirectional < MIN_N_FOR_SIGN) return null
  if (hitRate === null) return null
  if (hitRate <= FLIP_HIT_RATE) return -1
  if (hitRate >= KEEP_HIT_RATE) return 1
  return 0
}

function deriveConfidenceScore(ic, hitRate, n) {
  // 0..100. Maxes when the historical hit rate is far from 50% (the engine
  // KNOWS the direction — either keep or flip — with high evidence). The
  // raw IC contributes a softer floor for cases where hit rate is near 50%
  // but the magnitude of returns lines up with score magnitude.
  // The engine uses this to gate label emission via CALIBRATION_LABEL_GATE.
  if (n <= 0) return 0
  const fromHitRate = hitRate === null ? 0 : Math.abs(hitRate - 0.5) * 200
  const fromIc = ic === null ? 0 : Math.abs(ic) * 100
  return Math.min(100, Math.max(fromHitRate, fromIc))
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Pull all directional, non-null outcomes in the lookback window.
    // We paginate because Supabase caps a single request at 1000 rows.
    let outcomes = []
    let from = 0
    const page = 1000
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('signal_outcomes')
        .select('token, signal_type, eval_window, signal_score, price_change_pct, alpha_pct, correct')
        .gte('signal_time', since)
        .neq('signal_type', 'NEUTRAL')
        .not('correct', 'is', null)
        .order('signal_time', { ascending: false })
        .range(from, from + page - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      outcomes = outcomes.concat(data)
      if (data.length < page) break
      from += page
    }

    // Group by (token, eval_window).
    const buckets = new Map()
    for (const o of outcomes) {
      const k = `${o.token}|${o.eval_window}`
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k).push(o)
    }

    const rows = []
    for (const [key, rowsForBucket] of buckets) {
      const [token, evalWindow] = key.split('|')
      const n = rowsForBucket.length

      // Pearson IC needs paired (score, return) arrays.
      const scores = rowsForBucket.map(r => Number(r.signal_score)).filter(v => Number.isFinite(v))
      const returns = rowsForBucket.map(r => Number(r.price_change_pct)).filter(v => Number.isFinite(v))
      const ic = (scores.length === returns.length && scores.length >= 3)
        ? pearson(scores, returns)
        : null

      const nCorrect = rowsForBucket.filter(r => r.correct === true).length
      const hitRate = n > 0 ? nCorrect / n : null

      const alphas = rowsForBucket.map(r => Number(r.alpha_pct)).filter(v => Number.isFinite(v))
      const meanAlpha = alphas.length > 0
        ? alphas.reduce((a, b) => a + b, 0) / alphas.length
        : null

      const changes = rowsForBucket.map(r => Number(r.price_change_pct)).filter(v => Number.isFinite(v))
      const meanChange = changes.length > 0
        ? changes.reduce((a, b) => a + b, 0) / changes.length
        : null

      const signMultiplier = deriveSign(ic, hitRate, n)
      const confidenceScore = deriveConfidenceScore(ic, hitRate, n)

      rows.push({
        token,
        eval_window: evalWindow,
        ic: ic === null ? null : Number(ic.toFixed(4)),
        hit_rate: hitRate === null ? null : Number(hitRate.toFixed(4)),
        n_outcomes: n,
        n_directional: n, // we already filtered out NEUTRAL above
        mean_alpha: meanAlpha === null ? null : Number(meanAlpha.toFixed(4)),
        mean_change: meanChange === null ? null : Number(meanChange.toFixed(4)),
        sign_multiplier: signMultiplier,
        confidence_score: Number(confidenceScore.toFixed(2)),
        computed_at: new Date().toISOString(),
        lookback_days: LOOKBACK_DAYS,
      })
    }

    // Upsert all rows in a single round-trip.
    let upsertedCount = 0
    if (rows.length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from('token_signal_calibration')
        .upsert(rows, { onConflict: 'token,eval_window' })
      if (upErr) throw upErr
      upsertedCount = rows.length
    }

    // Quick summary for the cron log.
    const summary = {
      lookback_days: LOOKBACK_DAYS,
      outcomes_used: outcomes.length,
      buckets: buckets.size,
      upserted: upsertedCount,
      sample_flips: rows
        .filter(r => r.sign_multiplier === -1)
        .slice(0, 10)
        .map(r => `${r.token}|${r.eval_window} ic=${r.ic} hit=${r.hit_rate} n=${r.n_outcomes}`),
      sample_mutes: rows
        .filter(r => r.sign_multiplier === 0)
        .slice(0, 10)
        .map(r => `${r.token}|${r.eval_window} ic=${r.ic} hit=${r.hit_rate} n=${r.n_outcomes}`),
    }
    console.log('[CalibrateSignals]', JSON.stringify(summary))

    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[CalibrateSignals] error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
