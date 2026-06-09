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
 *   (a) override the engine's default +1 with a *recent* sign,
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
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import {
  pearsonIC,
  bootstrapICConfidenceInterval,
  deriveConfidenceScore as confidenceFromMath,
} from '@/app/lib/calibration-math'
import { olsBeta, winsorizeSeries, pairFiniteReturns, proportionTrue } from '@/lib/quant/beta'

export const dynamic = 'force-dynamic'
// Stage 4 budget: calibration is a single nightly batch, 90s is plenty.
export const maxDuration = 90

// 2026-05-04 (Stage 3): raised from 7d → 14d. Once the contamination from
// the 2026-04 cache bug + MATIC zombie quote has aged out (post 2026-05-10),
// the longer window stabilises the IC estimate without re-introducing the
// stale-data risk we hit in late April.
const LOOKBACK_DAYS = 14
const EVAL_WINDOWS = ['1h', '6h', '24h']

// 2026-05-04 (Stage 3): raised from 20 → 50. n=20 is below the threshold
// where bootstrap CIs are stable; tokens routinely promoted to -1 on a
// handful of unlucky days. n=50 ≈ ~12h of compute output × 3 windows and
// matches the MIN_N_FOR_TRUST in lib/quant/constants.ts for accuracy
// reporting.
const MIN_N_FOR_SIGN = 50

// 2026-05-04 (Stage 3): same threshold as MIN_N_FOR_SIGN. Tokens below this
// stay at confidence_score=0 so the engine's label gate cannot promote them.
const MIN_N_FOR_CONFIDENCE = 50

// 2026-05-04 (Stage 3): IC point-estimate magnitude required before we
// allow a flip-to-negative or flip-to-zero. Backed by the ic_audit.js runs
// across 30/60d windows where stable per-token edges live in the 0.15-0.30
// range; anything below is sample noise.
const MIN_IC_MAGNITUDE = 0.15

// 2026-05-04 (Stage 3): hysteresis. Number of consecutive nightly proposals
// that must agree before the live token_signal_calibration row's sign is
// allowed to change. Three nights ≈ 72h of fresh outcomes — long enough to
// suppress 1-day regime noise, short enough to react to real edge decay.
const HYSTERESIS_RUNS = 3

// Bootstrap resample count for the IC CI. 200 is the canonical floor for
// percentile CIs; 500 would be more stable but adds 2-3s per token-window.
const IC_BOOTSTRAP_RESAMPLES = 200

// Sign derivation is HIT-RATE-FIRST. IC magnitude + CI now act as
// CONFIRMATION GATES on a hit-rate proposal — we still won't apply a flip
// if the IC magnitude is in the noise band OR its 95% CI straddles 0.
//
// Hit-rate thresholds (unchanged from prior version):
//   hit_rate >= 0.60  → +1 (keep direction)
//   hit_rate <= 0.40  → -1 (invert)
//   0.40 < hr < 0.60  →  0 (coin flip; mute)
const FLIP_HIT_RATE = 0.40
const KEEP_HIT_RATE = 0.60

// ─── Beta estimation config (2026-06-09, audit item A) ───────────────────
// calibrate-signals doubles as the nightly beta refit: for every (token,
// eval_window) it regresses the token's window return on BTC's window return
// (OLS) and stores the slope in `token_beta`. evaluate-signals reads that
// table to grade each new outcome's market-neutral residual alpha. Beta is
// slow-moving, so a nightly refresh that intra-day grading reads is plenty.
//
// This pass is independent of the sign-calibration above and writes a
// DIFFERENT table, so it can run over ALL eval windows (not just the
// CHECK-constrained 1h/6h/24h) and over ALL outcomes including shadow —
// beta is a property of price co-movement, not of signal direction.
// Kill-switch: BETA_LABELING=off disables the whole pass.
const BETA_LOOKBACK_DAYS = 30
const BETA_MIN_SAMPLES = 30      // matches lib/quant/beta.ts olsBeta default
const BETA_WINSOR_PCT = 0.02     // clip 2%/tail before the regression


function pearson(xs, ys) {
  // Thin wrapper kept for back-compat with any in-file callers; delegates to
  // the pure module so logic lives in one place.
  return pearsonIC(xs, ys)
}

/**
 * Hit-rate-first sign proposer. Returns null when n is insufficient OR when
 * the IC magnitude is in the noise band OR when the IC bootstrap CI
 * straddles 0 — both gates are meant to suppress sample-noise flips that
 * would otherwise be ratified by a single unlucky day's hit rate.
 *
 * `null` here means "do not propose a change to the live row" — the cron
 * leaves token_signal_calibration.sign_multiplier as-is rather than wiping
 * it, so a previously confirmed sign keeps applying until enough fresh
 * evidence accumulates to justify a new proposal.
 */
function proposeSign({ ic, hitRate, n, icCI }) {
  if (n < MIN_N_FOR_SIGN) return null
  if (hitRate === null) return null
  // Hit-rate proposal:
  let proposed
  if (hitRate <= FLIP_HIT_RATE) proposed = -1
  else if (hitRate >= KEEP_HIT_RATE) proposed = 1
  else proposed = 0
  // Stage 3 confirmation gates: only ratify a non-+1 proposal when the IC
  // magnitude is meaningful AND its CI excludes 0. A proposed +1 needs no
  // gate (it's the engine's default direction).
  if (proposed === 1) return 1
  if (ic === null || Math.abs(ic) < MIN_IC_MAGNITUDE) return null
  if (!icCI) return null
  const ciExcludesZero =
    (icCI.lower > 0 && icCI.upper > 0) ||
    (icCI.lower < 0 && icCI.upper < 0)
  if (!ciExcludesZero) return null
  return proposed
}

function deriveConfidenceScore(ic, hitRate, n, icCI) {
  return confidenceFromMath({
    ic,
    hitRate,
    n,
    icCILower: icCI ? icCI.lower : null,
    icCIUpper: icCI ? icCI.upper : null,
    minNForConfidence: MIN_N_FOR_CONFIDENCE,
  })
}

/**
 * Hysteresis check. Returns true iff the last HYSTERESIS_RUNS proposals for
 * this (token, eval_window) all match `proposedSign` AND the live row's
 * sign currently differs (i.e. there's actually a flip queued up). Returns
 * false when:
 *   - fewer than HYSTERESIS_RUNS prior proposals exist (not enough history),
 *   - any of the recent proposals disagree with the new one (instability),
 *   - the live sign already equals the proposal (nothing to confirm).
 */
async function isFlipConfirmed(token, evalWindow, proposedSign, currentSign) {
  if (proposedSign === currentSign) return false
  const { data, error } = await supabaseAdmin
    .from('calibration_proposal_log')
    .select('proposed_sign, proposed_at')
    .eq('token', token)
    .eq('eval_window', evalWindow)
    .order('proposed_at', { ascending: false })
    .limit(HYSTERESIS_RUNS)
  if (error || !data || data.length < HYSTERESIS_RUNS) return false
  for (const row of data) {
    if (row.proposed_sign !== proposedSign) return false
  }
  return true
}

/**
 * Nightly beta refit (audit item A). Regresses each (token, eval_window)'s
 * return on BTC's return over the same window and upserts the OLS slope into
 * `token_beta`. evaluate-signals consumes this to label residual alpha.
 *
 * Returns a summary object. NEVER throws — a beta failure must not abort the
 * sign-calibration that precedes it. If the `token_beta` table is missing
 * (migration 20260609 not yet applied) the upsert error is caught and the
 * pass degrades to a no-op with a one-line warning.
 */
async function computeAndStoreBetas() {
  if (process.env.BETA_LABELING === 'off') {
    return { skipped: 'BETA_LABELING=off' }
  }

  const since = new Date(Date.now() - BETA_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Pull token + BTC window returns for every graded outcome (direction-
  // agnostic, shadow included). Filter suspect rows — frozen-benchmark
  // poisoning would corrupt the slope. Paginate past the 1000-row cap.
  let rows = []
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('signal_outcomes')
      .select('token, eval_window, price_change_pct, btc_change_pct')
      .gte('signal_time', since)
      .eq('suspect', false)
      .not('price_change_pct', 'is', null)
      .not('btc_change_pct', 'is', null)
      .order('signal_time', { ascending: false })
      .range(from, from + page - 1)
    if (error) {
      console.warn('[CalibrateSignals] beta pull failed:', error.message)
      return { error: error.message }
    }
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < page) break
    from += page
  }

  // Group by (token, eval_window).
  const buckets = new Map()
  for (const r of rows) {
    const k = `${r.token}|${r.eval_window}`
    if (!buckets.has(k)) buckets.set(k, { asset: [], market: [] })
    const b = buckets.get(k)
    b.asset.push(r.price_change_pct)
    b.market.push(r.btc_change_pct)
  }

  const decidedAt = new Date().toISOString()
  const betaRows = []
  for (const [key, series] of buckets) {
    const [token, evalWindow] = key.split('|')
    // Pair first (drop nulls, keep alignment), THEN winsorize each leg so a
    // single data-error spike can't lever the slope. Element-wise clipping
    // preserves the (x, y) pairing.
    const { asset, market } = pairFiniteReturns(series.asset, series.market)
    if (asset.length < BETA_MIN_SAMPLES) continue
    const assetW = winsorizeSeries(asset, BETA_WINSOR_PCT)
    const marketW = winsorizeSeries(market, BETA_WINSOR_PCT)
    const result = olsBeta(assetW, marketW, { minN: BETA_MIN_SAMPLES })
    if (!result) continue
    betaRows.push({
      token,
      eval_window: evalWindow,
      beta: Number(result.beta.toFixed(4)),
      n_samples: result.n,
      r_squared: Number(result.rSquared.toFixed(4)),
      lookback_days: BETA_LOOKBACK_DAYS,
      computed_at: decidedAt,
    })
  }

  if (betaRows.length === 0) {
    return { buckets: buckets.size, betas_written: 0 }
  }

  const { error: upErr } = await supabaseAdmin
    .from('token_beta')
    .upsert(betaRows, { onConflict: 'token,eval_window' })
  if (upErr) {
    // Most likely the migration hasn't been applied yet — non-fatal.
    console.warn('[CalibrateSignals] token_beta upsert failed (migration 20260609 applied?):', upErr.message)
    return { error: upErr.message, betas_computed: betaRows.length }
  }
  return {
    buckets: buckets.size,
    betas_written: betaRows.length,
    sample: betaRows.slice(0, 8).map(b => `${b.token}|${b.eval_window} β=${b.beta} R²=${b.r_squared} n=${b.n_samples}`),
  }
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // ─── Metric mode (raw vs alpha) ──────────────────────────────────────
    // Default: the per-token sign + confidence are derived from RAW return IC
    // and RAW hit-rate (unchanged). Under CALIBRATION_USE_ALPHA=on they derive
    // from MARKET-NEUTRAL residual alpha instead, so calibration stops
    // rewarding beta (audit item B, calibration layer — the deeper twin of the
    // alpha breaker). residual_alpha/beat_residual ship in migration 20260609;
    // if the flag is on but the columns aren't there yet, we degrade to raw
    // for the run rather than failing calibration.
    const wantAlpha = process.env.CALIBRATION_USE_ALPHA === 'on'
    let alphaColumnsAvailable = wantAlpha
    const BASE_COLS = 'token, signal_type, eval_window, signal_score, price_change_pct, alpha_pct, beat_benchmark, correct'
    const ALPHA_COLS = ', residual_alpha, beat_residual'

    // Pull all directional, non-null outcomes in the lookback window.
    // We paginate because Supabase caps a single request at 1000 rows.
    let outcomes = []
    let from = 0
    const page = 1000
    while (true) {
      const selectCols = alphaColumnsAvailable ? BASE_COLS + ALPHA_COLS : BASE_COLS
      const { data, error } = await supabaseAdmin
        .from('signal_outcomes')
        .select(selectCols)
        .gte('signal_time', since)
        .neq('signal_type', 'NEUTRAL')
        .not('correct', 'is', null)
        .order('signal_time', { ascending: false })
        .range(from, from + page - 1)
      if (error) {
        // Pre-migration: residual columns absent. Drop them and retry the
        // same page in raw mode so calibration still runs.
        if (alphaColumnsAvailable && /residual_alpha|beat_residual|does not exist/i.test(error.message)) {
          console.warn('[CalibrateSignals] residual columns absent — CALIBRATION_USE_ALPHA degrades to raw this run (migration 20260609 applied?)')
          alphaColumnsAvailable = false
          continue
        }
        throw error
      }
      if (!data || data.length === 0) break
      outcomes = outcomes.concat(data)
      if (data.length < page) break
      from += page
    }
    const useAlpha = wantAlpha && alphaColumnsAvailable

    // Group by (token, eval_window).
    const buckets = new Map()
    for (const o of outcomes) {
      const k = `${o.token}|${o.eval_window}`
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k).push(o)
    }

    // Pull current live calibration rows in one round-trip — needed both for
    // the "is this a real change?" check and to keep the existing
    // sign_multiplier when this run's evidence is too thin to propose a new
    // one (guards against accidental wipes during quiet days).
    const tokensSet = new Set()
    for (const k of buckets.keys()) tokensSet.add(k.split('|')[0])
    const tokens = [...tokensSet]
    const currentByKey = new Map()
    if (tokens.length > 0) {
      const { data: live } = await supabaseAdmin
        .from('token_signal_calibration')
        .select('token, eval_window, sign_multiplier')
        .in('token', tokens)
      for (const row of live || []) {
        currentByKey.set(`${row.token}|${row.eval_window}`, row.sign_multiplier)
      }
    }

    const rows = []
    const proposalInserts = []
    const changeInserts = []
    const audit = []
    const decidedAt = new Date().toISOString()

    for (const [key, rowsForBucket] of buckets) {
      const [token, evalWindow] = key.split('|')
      const n = rowsForBucket.length

      // ─── Metric selection (raw vs alpha) ────────────────────────────────
      // raw (default): IC of score vs raw return + raw hit-rate.
      // alpha (CALIBRATION_USE_ALPHA=on): IC of score vs MARKET-NEUTRAL
      //   residual return + residual beat-rate. Residual is preferred per
      //   row, falling back to raw-alpha benchmark then raw return while
      //   token_beta backfills, so the flag degrades gracefully token by token.
      let ic, icCI, hitRate, gateN
      if (useAlpha) {
        // Per-row residual-preferred return, properly paired with the score
        // (drop rows where either side is non-finite to keep IC aligned).
        const sa = []
        const ra = []
        for (const r of rowsForBucket) {
          const ret = r.residual_alpha != null ? Number(r.residual_alpha)
            : r.alpha_pct != null ? Number(r.alpha_pct)
              : Number(r.price_change_pct)
          const sc = Number(r.signal_score)
          if (Number.isFinite(sc) && Number.isFinite(ret)) { sa.push(sc); ra.push(ret) }
        }
        ic = sa.length >= 3 ? pearson(sa, ra) : null
        icCI = sa.length >= 10 ? bootstrapICConfidenceInterval(sa, ra, IC_BOOTSTRAP_RESAMPLES) : null
        // Residual-preferred beat flag per row; proportionTrue skips nulls.
        const flags = rowsForBucket.map(r => (r.beat_residual != null ? r.beat_residual : r.beat_benchmark))
        const bt = proportionTrue(flags)
        hitRate = bt.n > 0 ? bt.pct / 100 : null
        gateN = bt.n
      } else {
        // Pearson IC needs paired (score, return) arrays.
        const scores = rowsForBucket.map(r => Number(r.signal_score)).filter(v => Number.isFinite(v))
        const returns = rowsForBucket.map(r => Number(r.price_change_pct)).filter(v => Number.isFinite(v))
        ic = (scores.length === returns.length && scores.length >= 3)
          ? pearson(scores, returns)
          : null
        // Bootstrap 95% CI for the IC. Used both as a flip-confirmation gate
        // (CI must exclude 0) and as a small confidence-score kicker.
        icCI = (scores.length === returns.length && scores.length >= 10)
          ? bootstrapICConfidenceInterval(scores, returns, IC_BOOTSTRAP_RESAMPLES)
          : null
        const nCorrect = rowsForBucket.filter(r => r.correct === true).length
        hitRate = n > 0 ? nCorrect / n : null
        gateN = n
      }

      const alphas = rowsForBucket.map(r => Number(r.alpha_pct)).filter(v => Number.isFinite(v))
      const meanAlpha = alphas.length > 0
        ? alphas.reduce((a, b) => a + b, 0) / alphas.length
        : null
      const changes = rowsForBucket.map(r => Number(r.price_change_pct)).filter(v => Number.isFinite(v))
      const meanChange = changes.length > 0
        ? changes.reduce((a, b) => a + b, 0) / changes.length
        : null

      const proposedSign = proposeSign({ ic, hitRate, n: gateN, icCI })
      const currentSign = currentByKey.get(key)
      const currentSignNorm = (currentSign === -1 || currentSign === 0 || currentSign === 1) ? currentSign : null

      // Decide what sign actually goes into token_signal_calibration this run.
      //
      //   action = 'unchanged': keep the live sign as-is. Either we don't
      //                         have a proposal at all (insufficient evidence)
      //                         or the proposal already matches the live sign.
      //   action = 'propose'  : we have a proposal that disagrees with the
      //                         live sign but it hasn't been confirmed by
      //                         HYSTERESIS_RUNS prior matching proposals yet.
      //                         Log the proposal, do NOT change the live row.
      //   action = 'apply'    : the proposal is confirmed (last
      //                         HYSTERESIS_RUNS proposals all agreed).
      //                         Update the live row + write change_log.
      let action = 'unchanged'
      let signToWrite = currentSignNorm
      let confirmedRuns = 0

      if (proposedSign === null) {
        action = 'unchanged'
        signToWrite = currentSignNorm
      } else if (proposedSign === currentSignNorm) {
        action = 'unchanged'
        signToWrite = currentSignNorm
        // Still log a proposal so the hysteresis count keeps building if this
        // sign ever gets challenged later — but only when n is meaningful.
        proposalInserts.push({
          token, eval_window: evalWindow,
          proposed_sign: proposedSign,
          ic: ic === null ? null : Number(ic.toFixed(4)),
          hit_rate: hitRate === null ? null : Number(hitRate.toFixed(4)),
          n_outcomes: n,
          proposed_at: decidedAt,
        })
      } else {
        // Proposal disagrees with the live sign — log it unconditionally,
        // then check hysteresis BEFORE adding the new proposal so the count
        // reflects only PRIOR runs.
        const confirmed = await isFlipConfirmed(token, evalWindow, proposedSign, currentSignNorm)
        proposalInserts.push({
          token, eval_window: evalWindow,
          proposed_sign: proposedSign,
          ic: ic === null ? null : Number(ic.toFixed(4)),
          hit_rate: hitRate === null ? null : Number(hitRate.toFixed(4)),
          n_outcomes: n,
          proposed_at: decidedAt,
        })
        if (confirmed) {
          action = 'apply'
          signToWrite = proposedSign
          confirmedRuns = HYSTERESIS_RUNS
          changeInserts.push({
            token, eval_window: evalWindow,
            old_sign: currentSignNorm,
            new_sign: proposedSign,
            ic: ic === null ? null : Number(ic.toFixed(4)),
            hit_rate: hitRate === null ? null : Number(hitRate.toFixed(4)),
            n_outcomes: n,
            confirmed_runs: HYSTERESIS_RUNS,
            decided_at: decidedAt,
          })
        } else {
          action = 'propose'
          signToWrite = currentSignNorm
        }
      }

      const confidenceScore = deriveConfidenceScore(ic, hitRate, gateN, icCI)

      rows.push({
        token,
        eval_window: evalWindow,
        ic: ic === null ? null : Number(ic.toFixed(4)),
        hit_rate: hitRate === null ? null : Number(hitRate.toFixed(4)),
        n_outcomes: n,
        n_directional: n,
        mean_alpha: meanAlpha === null ? null : Number(meanAlpha.toFixed(4)),
        mean_change: meanChange === null ? null : Number(meanChange.toFixed(4)),
        sign_multiplier: signToWrite,
        confidence_score: Number(confidenceScore.toFixed(2)),
        computed_at: decidedAt,
        lookback_days: LOOKBACK_DAYS,
      })

      audit.push({
        token,
        window: evalWindow,
        current_sign: currentSignNorm,
        proposed_sign: proposedSign,
        ic: ic === null ? null : Number(ic.toFixed(4)),
        ic_ci: icCI ? [Number(icCI.lower.toFixed(4)), Number(icCI.upper.toFixed(4))] : null,
        n,
        action,
        confirmed_runs: confirmedRuns,
      })
    }

    // Upsert calibration + append-only logs in parallel single round-trips.
    let upsertedCount = 0
    if (rows.length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from('token_signal_calibration')
        .upsert(rows, { onConflict: 'token,eval_window' })
      if (upErr) throw upErr
      upsertedCount = rows.length
    }
    if (proposalInserts.length > 0) {
      const { error: propErr } = await supabaseAdmin
        .from('calibration_proposal_log')
        .insert(proposalInserts)
      if (propErr) {
        // Non-fatal: a missing proposal_log table shouldn't kill calibration.
        // Engineers reading this 6 months from now: this is gated behind the
        // 20260504c migration. If you see this warning, run that migration.
        console.warn('[CalibrateSignals] proposal_log insert failed:', propErr.message)
      }
    }
    if (changeInserts.length > 0) {
      const { error: chgErr } = await supabaseAdmin
        .from('calibration_change_log')
        .insert(changeInserts)
      if (chgErr) {
        console.warn('[CalibrateSignals] change_log insert failed:', chgErr.message)
      }
    }

    // ─── Nightly beta refit (audit item A) ───────────────────────────────
    // Runs after sign-calibration so a beta failure can never abort it.
    // Writes the token_beta table that evaluate-signals reads for residual
    // alpha. Wrapped defensively — degrades to a no-op if anything throws.
    let betaSummary
    try {
      betaSummary = await computeAndStoreBetas()
    } catch (betaErr) {
      console.warn('[CalibrateSignals] beta refit threw (non-fatal):', betaErr.message)
      betaSummary = { error: betaErr.message }
    }

    const summary = {
      lookback_days: LOOKBACK_DAYS,
      metric_mode: useAlpha ? 'alpha' : 'raw',
      alpha_requested: wantAlpha,
      outcomes_used: outcomes.length,
      buckets: buckets.size,
      upserted: upsertedCount,
      proposals_logged: proposalInserts.length,
      changes_applied: changeInserts.length,
      beta: betaSummary,
      sample_changes: changeInserts
        .slice(0, 10)
        .map(c => `${c.token}|${c.eval_window} ${c.old_sign}→${c.new_sign} ic=${c.ic} hit=${c.hit_rate} n=${c.n_outcomes}`),
      audit_sample: audit.slice(0, 20),
    }
    console.log('[CalibrateSignals]', JSON.stringify(summary))

    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[CalibrateSignals] error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
