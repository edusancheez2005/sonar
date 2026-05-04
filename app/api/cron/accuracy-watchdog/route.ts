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
    const { data: rows7d, error } = await supabaseAdmin
      .from('signal_outcomes')
      .select('signal_type, correct, signal_time')
      .gte('signal_time', sevenDaysAgo)
      .limit(20000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows1d = (rows7d || []).filter(r => r.signal_time >= oneDayAgo)

    const acc1d = accuracyOf(rows1d)
    const acc7d = accuracyOf(rows7d || [])

    // Distribution shares (computed on ALL rows, not just directional, so
    // we pick up a shift in NEUTRAL share too).
    const dist1d = {
      buy: buyShare(rows1d),
      sell: sellShare(rows1d),
      neutral: neutralShare(rows1d),
    }
    const dist7d = {
      buy: buyShare(rows7d || []),
      sell: sellShare(rows7d || []),
      neutral: neutralShare(rows7d || []),
    }

    const accDelta = acc1d.pct - acc7d.pct
    const distDelta = Math.max(
      Math.abs(dist1d.buy - dist7d.buy),
      Math.abs(dist1d.sell - dist7d.sell),
      Math.abs(dist1d.neutral - dist7d.neutral),
    ) * 100

    // Decide alert level + reason. Accuracy drop dominates (it's the
    // user-visible failure); distribution shift escalates alongside.
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
            sample_signals: (rows1d || []).slice(0, 10).map(r => ({
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
      webhook: webhookStatus,
    })
  } catch (err) {
    console.error('[AccuracyWatchdog] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
