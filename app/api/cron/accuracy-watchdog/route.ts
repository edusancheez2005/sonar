/**
 * CRON: Accuracy Watchdog
 * Schedule: Every 6h via Vercel cron (vercel.json).
 *
 * Computes the trailing 24h headline accuracy from signal_outcomes, compares
 * it to a 7d trailing baseline pulled from accuracy_baseline, and POSTs to
 * `process.env.ALERT_WEBHOOK_URL` (Slack/Discord-compatible) when EITHER:
 *
 *   (a) Headline accuracy dropped > ACCURACY_DROP_THRESHOLD_PP percentage
 *       points vs the 7d trailing average, OR
 *   (b) The signal distribution (BUY/SELL/NEUTRAL share of emitted signals)
 *       shifted > DISTRIBUTION_SHIFT_THRESHOLD_PCT in absolute share
 *       between trailing 24h and trailing 7d (a sudden regime change in
 *       what the engine emits is itself a signal something broke).
 *
 * Always writes one row to accuracy_baseline regardless. Webhook absence is
 * non-fatal — the row is still recorded for trend analysis.
 *
 * Added 2026-05-04 (Stage 4 hardening).
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
// Per Stage 4 budget: small batch, single webhook POST, 30s is generous.
export const maxDuration = 30

// Percentage-point drop in headline accuracy (24h vs 7d) that triggers an
// alert. 10pp is the "something is materially broken" threshold — small
// daily noise is typically <5pp.
const ACCURACY_DROP_THRESHOLD_PP = 10

// Absolute share shift in any of {buy,sell,neutral} between 24h and 7d
// distributions that triggers an alert. 25pp catches the "sign-flip
// inverted half the universe overnight" failure mode that motivated the
// 2026-05-04 hardening pass.
const DISTRIBUTION_SHIFT_THRESHOLD_PCT = 25

// ─── Statistical detectors (added 2026-05-04, post-Stage 4) ──────────────
// The fixed pp thresholds above are belt-and-suspenders for sudden cliffs.
// The z-score + CUSUM checks below catch slow drift that wouldn't trip the
// pp gates on any single day but compounds over a week.
//
// Both detectors warm up only once we have enough baseline samples to
// compute a meaningful mean/std (MIN_BASELINE_SAMPLES). With the cron
// running every 6h that's ~3 days of history — short enough to be useful,
// long enough to avoid alerting on the first real-data point.
const BASELINE_LOOKBACK_DAYS = 30
const MIN_BASELINE_SAMPLES = 12  // ~3 days @ 6h/sample
const Z_SCORE_ALERT_THRESHOLD = -2.0  // today's accuracy >2σ below trailing mean
const CUSUM_K = 0.5  // "slack" in σ units (only count deviations beyond 0.5σ)
const CUSUM_H = 5.0  // alert when |cumulative deviation| crosses 5σ
const CUSUM_LOOKBACK = 56  // ~14 days @ 6h/sample

// ─── Per-direction circuit breaker (added 2026-05-04 evening) ────────────
const BREAKER_LOOKBACK_HOURS = 6
const BREAKER_MIN_SAMPLES = 25
const BREAKER_SUPPRESS_PCT = 35
const BREAKER_CLEAR_PCT = 45

// ─── Time-valve backstop (added 2026-06-01) ────────────────────────────
// After SHADOW grading was added, the breaker clear path normally measures
// against shadow rows. But if shadow data is sparse or noisy and a breaker
// has been latched for >TIME_VALVE_HOURS while shadow accuracy is at least
// borderline-acceptable, force-release at half confidence (post-clear cap).
// Gated behind BREAKER_TIME_VALVE=on; default off until shadow data has
// stabilised for the operator-watched grace period.
const TIME_VALVE_HOURS = 72
const TIME_VALVE_MIN_SHADOW_ACC_PCT = 40
const TIME_VALVE_MIN_SHADOW_N = 15
const POST_CLEAR_CAP_HOURS = 6
const STALE_BREAKER_WARN_HOURS = 48

function shareOf(rows, type) {
  if (!rows.length) return 0
  let n = 0
  for (const r of rows) if (r.signal_type === type) n++
  return n / rows.length
}

function buyShare(rows) {
  return shareOf(rows, 'BUY') + shareOf(rows, 'STRONG BUY')
}
function sellShare(rows) {
  return shareOf(rows, 'SELL') + shareOf(rows, 'STRONG SELL')
}
function neutralShare(rows) {
  return shareOf(rows, 'NEUTRAL')
}

function accuracyOf(rows) {
  // Mirror /api/signals/accuracy: ignore correct=null (noise-floor + outlier
  // skips) and NEUTRAL outcomes (no directional view).
  const directional = rows.filter(r =>
    r.correct !== null && r.signal_type !== 'NEUTRAL'
  )
  if (!directional.length) return { pct: 0, n: 0 }
  const correct = directional.filter(r => r.correct === true).length
  return { pct: (correct / directional.length) * 100, n: directional.length }
}

/**
 * Accuracy of one signal direction over a row set. Treats 'BUY' and
 * 'STRONG BUY' as the BUY family; same for SELL. Returns { pct, n } where
 * pct=0 and n=0 if the family has no resolved samples in the window.
 */
function directionAccuracy(rows, family: 'BUY' | 'SELL') {
  const match = family === 'BUY'
    ? (t: string) => t === 'BUY' || t === 'STRONG BUY'
    : (t: string) => t === 'SELL' || t === 'STRONG SELL'
  const filtered = rows.filter(r => r.correct !== null && match(r.signal_type))
  if (!filtered.length) return { pct: 0, n: 0 }
  const correct = filtered.filter(r => r.correct === true).length
  return { pct: (correct / filtered.length) * 100, n: filtered.length }
}

/**
 * Sample mean + sample standard deviation (n-1 denominator).
 * Returns { mean: 0, std: 0 } for n<2 — caller is expected to gate on
 * sample count separately.
 */
function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length < 2) return { mean: xs[0] ?? 0, std: 0 }
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)
  return { mean, std: Math.sqrt(variance) }
}

/**
 * Two-sided CUSUM (Page 1954). Tracks cumulative sums of standardised
 * deviations from `mean`, with a `k`-sigma slack zone that prevents random
 * walk drift. Returns the final S+ and S− at the end of the window; either
 * crossing `h` is an alert. We only care about S− (decreasing accuracy)
 * for the watchdog but compute both for diagnostic logging.
 */
function cusum(xs: number[], mean: number, std: number, k = CUSUM_K) {
  if (std <= 0 || xs.length === 0) return { sPlus: 0, sMinus: 0 }
  let sPlus = 0
  let sMinus = 0
  for (const x of xs) {
    const z = (x - mean) / std
    sPlus = Math.max(0, sPlus + z - k)
    sMinus = Math.min(0, sMinus + z + k)
  }
  return { sPlus, sMinus }
}

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    if (secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = Date.now()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Pull the trailing 7d outcomes once; slice for 24h in JS.
    // 2026-06-01: also pull `shadow` so we can split live-only (headline)
    // from union (breaker) downstream. Headline accuracy stays user-facing
    // and excludes shadow; breaker clear-logic reads union so the dead-lock
    // diagnosed in SIGNAL_REMEDIATION_2026-06-01_PROMPT.md cannot recur.
    const { data: rows7d, error } = await supabaseAdmin
      .from('signal_outcomes')
      .select('signal_type, correct, signal_time, shadow')
      .gte('signal_time', sevenDaysAgo)
      .limit(20000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows1d = (rows7d || []).filter(r => r.signal_time >= oneDayAgo)

    // Live-only slices for headline metrics + distribution (shadow rows
    // would inflate counts and skew the user-visible numbers).
    const liveRows1d = rows1d.filter(r => !r.shadow)
    const liveRows7d = (rows7d || []).filter(r => !r.shadow)

    const acc1d = accuracyOf(liveRows1d)
    const acc7d = accuracyOf(liveRows7d)

    // Distribution shares (computed on ALL rows, not just directional, so
    // we pick up a shift in NEUTRAL share too).
    // Live-only: shadow rows have signal_type=BUY/SELL by construction,
    // which would mask any real BUY/SELL drought from the dashboards.
    const dist1d = {
      buy: buyShare(liveRows1d),
      sell: sellShare(liveRows1d),
      neutral: neutralShare(liveRows1d),
    }
    const dist7d = {
      buy: buyShare(liveRows7d),
      sell: sellShare(liveRows7d),
      neutral: neutralShare(liveRows7d),
    }

    const accDelta = acc1d.pct - acc7d.pct
    const distDelta = Math.max(
      Math.abs(dist1d.buy - dist7d.buy),
      Math.abs(dist1d.sell - dist7d.sell),
      Math.abs(dist1d.neutral - dist7d.neutral),
    ) * 100

    // ─── Statistical detectors ───────────────────────────────────────────
    // Pull the trailing 30 days of baseline rows (one per 6h ≈ 120 max) to
    // compute the rolling mean/std of accuracy_pct. We exclude rows where
    // sample_size was 0 (the cron still records an empty row to keep the
    // cadence regular but their accuracy_pct=0 would poison the mean).
    const baselineSince = new Date(now - BASELINE_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString()
    const { data: baselineRows } = await supabaseAdmin
      .from('accuracy_baseline')
      .select('accuracy_pct, sample_size, measured_at')
      .gte('measured_at', baselineSince)
      .order('measured_at', { ascending: true })
      .limit(500)

    const validBaseline = (baselineRows || []).filter(r => (r.sample_size || 0) >= 5)
    const accSeries: number[] = validBaseline.map(r => Number(r.accuracy_pct))
    let zScore: number | null = null
    let cusumMinus: number | null = null
    let baselineMean = 0
    let baselineStd = 0
    if (accSeries.length >= MIN_BASELINE_SAMPLES) {
      const stats = meanStd(accSeries)
      baselineMean = stats.mean
      baselineStd = stats.std
      if (baselineStd > 0) {
        zScore = (acc1d.pct - baselineMean) / baselineStd
        const tail = accSeries.slice(-CUSUM_LOOKBACK)
        cusumMinus = cusum(tail, baselineMean, baselineStd).sMinus
      }
    }

    // Decide alert level + reason. Accuracy drop dominates (it's the
    // user-visible failure); distribution shift escalates alongside; the
    // statistical detectors catch slow drift the pp rules would miss.
    let level: 'critical' | 'warn' | null = null
    const reasons: string[] = []
    if (acc7d.n >= 20 && accDelta < -ACCURACY_DROP_THRESHOLD_PP) {
      level = 'critical'
      reasons.push(`accuracy_drop ${accDelta.toFixed(1)}pp (24h=${acc1d.pct.toFixed(1)}% vs 7d=${acc7d.pct.toFixed(1)}%)`)
    }
    if (rows7d && rows7d.length >= 50 && distDelta > DISTRIBUTION_SHIFT_THRESHOLD_PCT) {
      level = level || 'warn'
      reasons.push(`distribution_shift ${distDelta.toFixed(1)}pp`)
    }
    if (zScore !== null && zScore < Z_SCORE_ALERT_THRESHOLD) {
      // z below −2 with insufficient pp drop is the slow-drift signal: today
      // is materially worse than the last 30 days even though the 24h-vs-7d
      // delta hasn't tripped. Promote to critical only if it's also below
      // −3σ (extreme), otherwise warn.
      level = zScore < -3 ? 'critical' : (level || 'warn')
      reasons.push(`z_score ${zScore.toFixed(2)}σ below 30d mean (μ=${baselineMean.toFixed(1)}%, σ=${baselineStd.toFixed(2)})`)
    }
    if (cusumMinus !== null && cusumMinus < -CUSUM_H) {
      // CUSUM crossing means accumulated drift over the last ~14 days is
      // beyond what random noise explains. Always at least warn.
      level = level || 'warn'
      reasons.push(`cusum_drift ${cusumMinus.toFixed(2)} (threshold −${CUSUM_H})`)
    }

    // ─── Circuit breaker per direction ───────────────────────────────────
    // 2026-06-01: clear-logic now reads UNION of live + shadow outcomes
    // (rowsBreakerWindow includes shadow rows). This is the dead-lock fix:
    // a suppressed direction still gets graded via the shadow path so the
    // clear condition stays measurable. Headline metrics above stay live-only.
    const breakerCutoff = new Date(now - BREAKER_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
    const rowsBreakerWindow = (rows7d || []).filter(r => r.signal_time >= breakerCutoff)
    const buy6h = directionAccuracy(rowsBreakerWindow, 'BUY')
    const sell6h = directionAccuracy(rowsBreakerWindow, 'SELL')

    // Shadow-only slices for the time-valve check (it should only fire when
    // there's enough SHADOW evidence; we don't want a 6h live blip to
    // release a 72h-old breaker).
    const shadowBreakerWindow = rowsBreakerWindow.filter(r => r.shadow)
    const shadowBuy = directionAccuracy(shadowBreakerWindow, 'BUY')
    const shadowSell = directionAccuracy(shadowBreakerWindow, 'SELL')

    const { data: breakerCurrent } = await supabaseAdmin
      .from('signal_circuit_breaker')
      .select('signal_type, active, triggered_at, confidence_cap_until')
    const breakerState: Record<string, { active: boolean; triggered_at: string | null; confidence_cap_until: string | null }> = {}
    for (const row of breakerCurrent || []) {
      breakerState[row.signal_type] = {
        active: !!row.active,
        triggered_at: row.triggered_at,
        confidence_cap_until: row.confidence_cap_until ?? null,
      }
    }

    const breakerOutcome: Record<string, { active: boolean; transition: string | null; pct: number; n: number; shadow_pct?: number; shadow_n?: number }> = {}
    const timeValveOn = process.env.BREAKER_TIME_VALVE === 'on'
    for (const family of ['BUY', 'SELL'] as const) {
      const m = family === 'BUY' ? buy6h : sell6h
      const shadowM = family === 'BUY' ? shadowBuy : shadowSell
      const cur = breakerState[family] || { active: false, triggered_at: null, confidence_cap_until: null }
      let nextActive = cur.active
      let transition: string | null = null
      let releaseReason: 'standard' | 'time_valve' | null = null
      if (m.n >= BREAKER_MIN_SAMPLES) {
        if (!cur.active && m.pct < BREAKER_SUPPRESS_PCT) {
          nextActive = true
          transition = 'tripped'
        } else if (cur.active && m.pct >= BREAKER_CLEAR_PCT) {
          nextActive = false
          transition = 'cleared'
          releaseReason = 'standard'
        }
      }
      // Time-valve backstop: if the standard clear didn't fire AND the
      // breaker has been latched longer than TIME_VALVE_HOURS AND shadow
      // accuracy is at least borderline-acceptable, force-release with a
      // post-clear confidence cap. Off by default; operator flips
      // BREAKER_TIME_VALVE=on after watching shadow data stabilise.
      if (
        timeValveOn
        && transition === null
        && cur.active
        && cur.triggered_at
        && (now - new Date(cur.triggered_at).getTime()) > TIME_VALVE_HOURS * 3600 * 1000
        && shadowM.n >= TIME_VALVE_MIN_SHADOW_N
        && shadowM.pct >= TIME_VALVE_MIN_SHADOW_ACC_PCT
      ) {
        nextActive = false
        transition = 'cleared'
        releaseReason = 'time_valve'
      }
      breakerOutcome[family] = {
        active: nextActive,
        transition,
        pct: Number(m.pct.toFixed(2)),
        n: m.n,
        shadow_pct: Number(shadowM.pct.toFixed(2)),
        shadow_n: shadowM.n,
      }

      // Stale-breaker warning: a breaker latched >STALE_BREAKER_WARN_HOURS
      // without a transition is operationally suspicious even when shadow
      // hasn't reached the clear threshold. Emit a warn-level reason so we
      // never sleep on a dead-lock again (counter-factual: the bug we're
      // fixing went undetected for 21 days because nothing alerted).
      if (
        cur.active
        && transition === null
        && cur.triggered_at
        && (now - new Date(cur.triggered_at).getTime()) > STALE_BREAKER_WARN_HOURS * 3600 * 1000
      ) {
        const ageHours = Math.round((now - new Date(cur.triggered_at).getTime()) / 3600000)
        level = level || 'warn'
        reasons.push(`stale_breaker:${family} age=${ageHours}h live=${m.pct.toFixed(1)}%/n${m.n} shadow=${shadowM.pct.toFixed(1)}%/n${shadowM.n}`)
      }

      if (transition !== null) {
        const reason = transition === 'tripped'
          ? `auto_suppress: ${family} acc ${m.pct.toFixed(1)}% on n=${m.n} over last ${BREAKER_LOOKBACK_HOURS}h (< ${BREAKER_SUPPRESS_PCT}%)`
          : releaseReason === 'time_valve'
            ? `time_valve_release: ${family} latched >${TIME_VALVE_HOURS}h; shadow acc ${shadowM.pct.toFixed(1)}% on n=${shadowM.n} (>= ${TIME_VALVE_MIN_SHADOW_ACC_PCT}%). Confidence capped ${POST_CLEAR_CAP_HOURS}h.`
            : `auto_clear: ${family} acc ${m.pct.toFixed(1)}% on n=${m.n} recovered (>= ${BREAKER_CLEAR_PCT}%)`
        const upsertRow: Record<string, unknown> = {
          signal_type: family,
          active: nextActive,
          reason,
          acc_pct: Number(m.pct.toFixed(2)),
          sample_size: m.n,
          updated_at: new Date().toISOString(),
        }
        if (transition === 'tripped') {
          upsertRow.triggered_at = new Date().toISOString()
          upsertRow.cleared_at = null
          upsertRow.confidence_cap_until = null
        } else {
          upsertRow.cleared_at = new Date().toISOString()
          // Every clear (standard or time-valve) gets a post-clear cap so
          // the re-entry never starts at full confidence. compute-signals
          // reads confidence_cap_until and halves confidence until expiry.
          upsertRow.confidence_cap_until = new Date(now + POST_CLEAR_CAP_HOURS * 3600 * 1000).toISOString()
        }
        const { error: bErr } = await supabaseAdmin
          .from('signal_circuit_breaker')
          .upsert(upsertRow, { onConflict: 'signal_type' })
        if (bErr) {
          console.warn(`[AccuracyWatchdog] breaker upsert ${family} failed:`, bErr.message)
        } else {
          // Promote breaker transitions to alert reasons so the webhook fires.
          level = transition === 'tripped' ? 'critical' : (level || 'warn')
          reasons.push(`circuit_breaker_${transition}${releaseReason === 'time_valve' ? '_time_valve' : ''}:${family} (live ${m.pct.toFixed(1)}% n=${m.n}, shadow ${shadowM.pct.toFixed(1)}% n=${shadowM.n})`)
        }
      }
    }

    // Materialise the final reason text after the breaker block so any
    // tripped/cleared transitions land in the baseline row + webhook.
    const reasonText = reasons.join(' | ')

    // Always record the baseline row so historical trend analysis works.
    const { error: insErr } = await supabaseAdmin
      .from('accuracy_baseline')
      .insert({
        accuracy_pct: Number(acc1d.pct.toFixed(2)),
        sample_size: acc1d.n,
        buy_share: Number((dist1d.buy * 100).toFixed(2)),
        sell_share: Number((dist1d.sell * 100).toFixed(2)),
        neutral_share: Number((dist1d.neutral * 100).toFixed(2)),
        alerted: level !== null,
        alert_reason: reasonText || null,
      })
    if (insErr) {
      console.warn('[AccuracyWatchdog] baseline insert failed:', insErr.message)
    }

    // Fire webhook on alert. Native fetch only — no axios.
    let webhookStatus = 'skipped_no_alert'
    if (level !== null) {
      const url = process.env.ALERT_WEBHOOK_URL
      if (!url) {
        webhookStatus = 'skipped_no_webhook_env'
      } else {
        try {
          const payload = {
            text: `[Sonar][${level.toUpperCase()}] ${reasonText}`,
            level,
            metric: 'accuracy_24h_vs_7d',
            current: {
              accuracy_pct: Number(acc1d.pct.toFixed(2)),
              n: acc1d.n,
              distribution: dist1d,
            },
            baseline: {
              accuracy_pct: Number(acc7d.pct.toFixed(2)),
              n: acc7d.n,
              distribution: dist7d,
            },
            delta: {
              accuracy_pp: Number(accDelta.toFixed(2)),
              distribution_max_pp: Number(distDelta.toFixed(2)),
            },
            sample_signals: (liveRows1d || []).slice(0, 10).map(r => ({
              type: r.signal_type, correct: r.correct, at: r.signal_time,
            })),
          }
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
          })
          webhookStatus = `posted_${resp.status}`
        } catch (e) {
          webhookStatus = `failed_${e.message}`
        }
      }
    }

    return NextResponse.json({
      ok: true,
      level,
      reason: reasonText || null,
      acc_24h: { pct: Number(acc1d.pct.toFixed(2)), n: acc1d.n },
      acc_7d: { pct: Number(acc7d.pct.toFixed(2)), n: acc7d.n },
      accuracy_delta_pp: Number(accDelta.toFixed(2)),
      distribution_24h: dist1d,
      distribution_7d: dist7d,
      distribution_max_shift_pp: Number(distDelta.toFixed(2)),
      // Statistical detectors — null when warmup hasn't completed.
      baseline: {
        samples: accSeries.length,
        mean_pct: Number(baselineMean.toFixed(2)),
        std_pct: Number(baselineStd.toFixed(2)),
        z_score: zScore === null ? null : Number(zScore.toFixed(2)),
        cusum_minus: cusumMinus === null ? null : Number(cusumMinus.toFixed(2)),
      },
      circuit_breaker: breakerOutcome,
      webhook: webhookStatus,
    })
  } catch (err) {
    console.error('[AccuracyWatchdog] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
