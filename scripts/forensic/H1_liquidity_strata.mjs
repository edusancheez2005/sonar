#!/usr/bin/env node
/**
 * H1 — 24h SELL loss is concentrated in illiquid tokens
 *
 * Hypothesis: the negative mean alpha on SELL signals concentrates in the
 * bottom market-cap quintiles; top 2 quintiles' SELL alpha is closer to
 * zero / actually viable.
 *
 * Method:
 *   1. Pull 24h SELL outcomes (suspect=false) with alpha_pct.
 *   2. Join token_signals → market_cap (proxy for liquidity).
 *   3. Quintile-bucket on market_cap.
 *   4. Compute mean alpha per quintile (alpha sign-normalised: for SELL,
 *      -alpha so higher = better).
 *
 * PASS: top-2 quintile mean α_norm ≥ -2.0pp  → restrict SELL to top quintiles.
 * KILL: all 5 quintiles within ±2pp of each other  → uniform, not liquidity.
 * INCONCLUSIVE: otherwise, or any quintile n < 30.
 *
 * Read-only.
 */

import { makeClient, fetchAll, writeResult, appendFinding, mean, FORENSIC_WINDOW_START } from './_lib.mjs'

const HYPOTHESIS = 'H1 — Liquidity strata'

async function main() {
  const client = makeClient()
  console.log('[H1] fetching 24h SELL outcomes')

  const outcomes = await fetchAll(() => client
    .from('signal_outcomes')
    .select('signal_id, signal_type, alpha_pct, price_change_pct')
    .eq('suspect', false)
    .eq('eval_window', '24h')
    .in('signal_type', ['SELL', 'STRONG SELL'])
    .not('correct', 'is', null)
    .gte('signal_time', FORENSIC_WINDOW_START))

  const ids = [...new Set(outcomes.map(o => o.signal_id).filter(Boolean))]
  const sigById = new Map()
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500)
    const { data, error } = await client
      .from('token_signals')
      .select('id, market_cap')
      .in('id', batch)
    if (error) throw error
    for (const r of (data || [])) sigById.set(r.id, r)
  }

  const rows = []
  for (const o of outcomes) {
    const s = sigById.get(o.signal_id)
    if (!s) continue
    const target = Number.isFinite(o.alpha_pct) ? o.alpha_pct : o.price_change_pct
    if (!Number.isFinite(target) || !Number.isFinite(s.market_cap) || s.market_cap <= 0) continue
    rows.push({ mc: Number(s.market_cap), alphaNorm: -target })
  }

  if (rows.length < 150) {
    const payload = {
      hypothesis: HYPOTHESIS,
      window_start: FORENSIC_WINDOW_START,
      n: rows.length,
      verdict: 'INCONCLUSIVE',
      summary: `n=${rows.length} insufficient for quintile analysis`,
    }
    writeResult('H1_liquidity_strata', payload)
    appendFinding({ hypothesis: HYPOTHESIS, verdict: payload.verdict, summary: payload.summary, resultsFile: 'results/H1_liquidity_strata.json' })
    console.log(`[H1] ${payload.verdict} — ${payload.summary}`)
    return
  }

  // Quintile cuts on market_cap
  const sorted = rows.slice().sort((a, b) => a.mc - b.mc)
  const cuts = [0.2, 0.4, 0.6, 0.8].map(q => sorted[Math.floor(q * sorted.length)].mc)

  function quintileOf(mc) {
    for (let i = 0; i < cuts.length; i++) if (mc <= cuts[i]) return i + 1
    return 5
  }

  const buckets = [1, 2, 3, 4, 5].map(q => {
    const subset = rows.filter(r => quintileOf(r.mc) === q).map(r => r.alphaNorm)
    return {
      quintile: q,
      n: subset.length,
      mean_alpha_norm: subset.length ? mean(subset) : null,
    }
  })

  const top2 = rows.filter(r => quintileOf(r.mc) >= 4).map(r => r.alphaNorm)
  const top2Mean = top2.length ? mean(top2) : null

  const allMeans = buckets.map(b => b.mean_alpha_norm).filter(v => v != null)
  const spread = allMeans.length ? Math.max(...allMeans) - Math.min(...allMeans) : null
  const allBad = allMeans.every(v => v <= -5)

  let verdict, summary
  const anySmallN = buckets.some(b => b.n < 30)
  if (anySmallN) {
    verdict = 'INCONCLUSIVE'
    summary = `quintile n's: ${buckets.map(b => b.n).join(',')} — some <30`
  } else if (top2Mean != null && top2Mean >= -2.0) {
    verdict = 'PASS'
    summary = `top-2 quintile mean α_norm=${top2Mean.toFixed(2)}pp ≥ -2.0 (per-quintile means: ${buckets.map(b => b.mean_alpha_norm.toFixed(1)).join(', ')})`
  } else if (spread != null && spread < 2.0 && allBad) {
    verdict = 'KILL'
    summary = `quintile spread=${spread.toFixed(2)}pp < 2 and all ≤ -5pp — SELL uniformly broken, not liquidity`
  } else {
    verdict = 'INCONCLUSIVE'
    summary = `top-2 mean=${top2Mean?.toFixed(2)}pp, spread=${spread?.toFixed(2)}pp — between thresholds`
  }

  writeResult('H1_liquidity_strata', {
    hypothesis: HYPOTHESIS,
    window_start: FORENSIC_WINDOW_START,
    n: rows.length,
    market_cap_cuts: cuts,
    quintile_buckets: buckets,
    top2_mean_alpha_norm: top2Mean,
    spread_pp: spread,
    verdict,
    summary,
  })
  appendFinding({ hypothesis: HYPOTHESIS, verdict, summary, resultsFile: 'results/H1_liquidity_strata.json' })
  console.log(`[H1] ${verdict} — ${summary}`)
}

main().catch(err => { console.error(err); process.exit(1) })
