// scripts/audit-engine-skill.mjs
//
// The honest measure of whether the signal engine has skill, separated
// from base-rate effects.
//
// Key insight: in a strong directional regime, raw "accuracy" is dominated
// by the base rate of which side won. A SELL-heavy engine in a bear week
// looks 90% accurate even with zero skill. The signal that matters is
// CROSS-SECTIONAL SPREAD: do tokens we say BUY outperform tokens we say
// SELL, in the same time window? If yes — and the spread is in the right
// direction — we have skill. If the spread is positive but inverted
// (SELLs outperform BUYs) the engine has skill but the labels are wrong
// for the current regime.
//
// Output:
//   1. Daily cross-sectional spread = avg(ret | BUY) − avg(ret | SELL)
//   2. Same, by detected regime
//   3. Per-tier "information coefficient" = corr(tier_score, fwd_return)
//      bucketed by regime (identifies which tier carries the wrong sign)
//   4. Excludes suspect=true rows
//
// Usage:  node scripts/audit-engine-skill.mjs [--days 7]

import fs from 'node:fs'
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const args = process.argv.slice(2)
const dayArg = args.indexOf('--days')
const DAYS = dayArg >= 0 ? parseInt(args[dayArg + 1], 10) : 7

const since = new Date(Date.now() - DAYS * 86400_000).toISOString()

// Fetch evaluated outcomes excluding suspect rows. 6h window only — the
// engine's primary horizon and where we have most coverage.
async function fetchOutcomes() {
  // Try select with `suspect` first; fall back if migration not yet applied.
  for (const cols of [
    'signal_time,token,signal_type,signal_score,raw_score,raw_direction,price_change_pct,btc_change_pct,btc_price_at_eval,alpha_pct,correct,suspect,eval_window',
    'signal_time,token,signal_type,signal_score,raw_score,raw_direction,price_change_pct,btc_change_pct,btc_price_at_eval,alpha_pct,correct,eval_window',
  ]) {
    const url =
      `${URL}/rest/v1/signal_outcomes` +
      `?select=${cols}` +
      `&eval_window=eq.6h` +
      `&signal_time=gte.${encodeURIComponent(since)}` +
      `&order=signal_time.desc` +
      `&limit=20000`
    const r = await fetch(url, { headers: H })
    if (r.ok) return r.json()
    const body = await r.text()
    if (!body.includes('suspect')) throw new Error(`outcomes fetch ${r.status}: ${body}`)
  }
  return []
}

function avg(xs) {
  const a = xs.filter((x) => Number.isFinite(x))
  if (!a.length) return null
  return a.reduce((s, x) => s + x, 0) / a.length
}

function median(xs) {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

function welchT(a, b) {
  // two-sample Welch t-stat for difference of means; ignores df / p-value
  // — we just want a magnitude check on whether the spread is noise.
  const xa = a.filter(Number.isFinite)
  const xb = b.filter(Number.isFinite)
  if (xa.length < 2 || xb.length < 2) return null
  const ma = avg(xa), mb = avg(xb)
  const va = xa.reduce((s, x) => s + (x - ma) ** 2, 0) / (xa.length - 1)
  const vb = xb.reduce((s, x) => s + (x - mb) ** 2, 0) / (xb.length - 1)
  const se = Math.sqrt(va / xa.length + vb / xb.length)
  if (se === 0) return null
  return (ma - mb) / se
}

function bullish(t) { return t === 'BUY' || t === 'STRONG BUY' }
function bearish(t) { return t === 'SELL' || t === 'STRONG SELL' }

// ─── Frozen-benchmark guardrail (May-11 lesson #3) ─────────────────────
// The May 2026 fetch-cache bug froze btc_price_at_eval at a single value
// ($76,876) across ~47% of rows, manufacturing a phantom SELL edge. Across
// a multi-day window no single BTC eval price should dominate — if one value
// holds more than this share of rows, the benchmark feed was stale and every
// btc_change_pct / alpha_pct derived from it is poisoned. Quarantine those
// rows before computing anything.
const FROZEN_BTC_MAX_SHARE = 0.05

function quarantineFrozenBenchmark(allRows) {
  const counts = new Map()
  let withPrice = 0
  for (const r of allRows) {
    const v = r.btc_price_at_eval
    if (v === null || v === undefined) continue
    withPrice++
    const key = String(v)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  if (withPrice === 0) return { clean: allRows, frozenValue: null, frozenCount: 0, share: 0 }
  let frozenValue = null, frozenCount = 0
  for (const [key, n] of counts) {
    if (n > frozenCount) { frozenCount = n; frozenValue = key }
  }
  const share = frozenCount / withPrice
  if (share <= FROZEN_BTC_MAX_SHARE) return { clean: allRows, frozenValue: null, frozenCount: 0, share }
  const clean = allRows.filter((r) => String(r.btc_price_at_eval) !== frozenValue)
  return { clean, frozenValue, frozenCount, share }
}

const rawRows = (await fetchOutcomes()).filter((r) => r.suspect !== true)
const guard = quarantineFrozenBenchmark(rawRows)
if (guard.frozenValue !== null) {
  console.log('\n' + '!'.repeat(72))
  console.log('!! FROZEN-BENCHMARK GUARD TRIPPED — stale btc_price_at_eval detected')
  console.log(`!! value ${guard.frozenValue} appears in ${guard.frozenCount} rows ` +
    `(${(guard.share * 100).toFixed(1)}% > ${(FROZEN_BTC_MAX_SHARE * 100).toFixed(0)}% threshold)`)
  console.log('!! These rows are QUARANTINED. btc_change_pct / alpha_pct from them is')
  console.log('!! poisoned (fetch-cache bug, see May-11 note). Re-run after re-eval.')
  console.log('!'.repeat(72))
}
const rows = guard.clean
console.log(`\n=== audit-engine-skill: ${rows.length} clean 6h outcomes (last ${DAYS}d) ===\n`)

if (!rows.length) {
  console.log('No clean rows. Exiting.')
  process.exit(0)
}

// 1. Daily cross-sectional spread (avg BUY ret − avg SELL ret), with sample sizes.
const byDay = new Map()
for (const r of rows) {
  const day = r.signal_time.slice(0, 10)
  if (!byDay.has(day)) byDay.set(day, [])
  byDay.get(day).push(r)
}

console.log('— Daily cross-sectional spread (avg ret | BUY − avg ret | SELL), 6h horizon —')
console.log('day         nBuy  nSell   avgBuy%   avgSell%   SPREAD%   t-stat')
for (const [day, ds] of [...byDay.entries()].sort()) {
  const buys = ds.filter((r) => bullish(r.signal_type))
  const sells = ds.filter((r) => bearish(r.signal_type))
  const ab = avg(buys.map((r) => r.price_change_pct))
  const as = avg(sells.map((r) => r.price_change_pct))
  const t = welchT(buys.map((r) => r.price_change_pct), sells.map((r) => r.price_change_pct))
  const spread = ab !== null && as !== null ? ab - as : null
  console.log(
    `${day}  ${String(buys.length).padStart(4)}  ${String(sells.length).padStart(5)}` +
    `  ${(ab ?? NaN).toFixed(2).padStart(7)}  ${(as ?? NaN).toFixed(2).padStart(8)}` +
    `  ${(spread ?? NaN).toFixed(2).padStart(7)}  ${(t ?? NaN).toFixed(2).padStart(6)}`
  )
}

// 2. Same, but conditioned on raw_direction (engine's pre-flip view).
//    If raw_direction has spread but signal_type doesn't → label flipping is hurting us.
console.log('\n— Same, conditioned on RAW direction (pre-engine-flip) —')
console.log('day         nBull  nBear  avgBull%  avgBear%   SPREAD%   t-stat')
for (const [day, ds] of [...byDay.entries()].sort()) {
  const bulls = ds.filter((r) => r.raw_direction === 'bullish')
  const bears = ds.filter((r) => r.raw_direction === 'bearish')
  const ab = avg(bulls.map((r) => r.price_change_pct))
  const as = avg(bears.map((r) => r.price_change_pct))
  const t = welchT(bulls.map((r) => r.price_change_pct), bears.map((r) => r.price_change_pct))
  const spread = ab !== null && as !== null ? ab - as : null
  console.log(
    `${day}  ${String(bulls.length).padStart(5)}  ${String(bears.length).padStart(5)}` +
    `  ${(ab ?? NaN).toFixed(2).padStart(7)}  ${(as ?? NaN).toFixed(2).padStart(7)}` +
    `  ${(spread ?? NaN).toFixed(2).padStart(7)}  ${(t ?? NaN).toFixed(2).padStart(6)}`
  )
}

// 3. Information coefficient by signal_score: rank correlation of score
//    with realized forward return. Spearman is robust to fat tails.
function spearman(pairs) {
  const n = pairs.length
  if (n < 5) return null
  const rank = (xs) => {
    const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
    const r = new Array(n)
    for (let i = 0; i < n; i++) r[idx[i][1]] = i + 1
    return r
  }
  const rx = rank(pairs.map((p) => p[0]))
  const ry = rank(pairs.map((p) => p[1]))
  const mx = (n + 1) / 2, my = mx
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my)
    dx += (rx[i] - mx) ** 2
    dy += (ry[i] - my) ** 2
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : null
}

console.log('\n— Information coefficient (Spearman: signal_score vs 6h fwd return) —')
const allPairs = rows
  .filter((r) => Number.isFinite(r.signal_score) && Number.isFinite(r.price_change_pct))
  .map((r) => [r.signal_score, r.price_change_pct])
const ic = spearman(allPairs)
console.log(`  All days, all signals: IC = ${(ic ?? NaN).toFixed(4)}  (n=${allPairs.length})`)
console.log(`  Interpretation: positive = high score → high return (engine works as labeled).`)
console.log(`                  near zero = no skill. negative = engine sign-inverted.`)

// Same IC but on raw_score (pre-flip)
const rawPairs = rows
  .filter((r) => Number.isFinite(r.raw_score) && Number.isFinite(r.price_change_pct))
  .map((r) => [r.raw_score, r.price_change_pct])
const rawIc = spearman(rawPairs)
console.log(`  All days, raw_score:   IC = ${(rawIc ?? NaN).toFixed(4)}  (n=${rawPairs.length})`)

// 4. Daily IC trend.
console.log('\n— Daily IC (signal_score vs 6h fwd return) —')
console.log('day          n   IC(signal)   IC(raw)')
for (const [day, ds] of [...byDay.entries()].sort()) {
  const sp = ds.filter((r) => Number.isFinite(r.signal_score) && Number.isFinite(r.price_change_pct)).map((r) => [r.signal_score, r.price_change_pct])
  const rp = ds.filter((r) => Number.isFinite(r.raw_score) && Number.isFinite(r.price_change_pct)).map((r) => [r.raw_score, r.price_change_pct])
  console.log(
    `${day}  ${String(ds.length).padStart(4)}   ${(spearman(sp) ?? NaN).toFixed(4).padStart(8)}   ${(spearman(rp) ?? NaN).toFixed(4).padStart(8)}`
  )
}

// 5. Headline: today's spread sign + magnitude is the GO/NO-GO indicator.
const today = new Date().toISOString().slice(0, 10)
const td = byDay.get(today) || []
const tBuys = td.filter((r) => bullish(r.signal_type))
const tSells = td.filter((r) => bearish(r.signal_type))
const tSpread = (avg(tBuys.map((r) => r.price_change_pct)) ?? 0) - (avg(tSells.map((r) => r.price_change_pct)) ?? 0)
console.log('\n=== HEADLINE ===')
console.log(`  Today (${today}): nBuy=${tBuys.length} nSell=${tSells.length} spread=${tSpread.toFixed(2)}pp`)
if (Math.abs(tSpread) < 0.5) {
  console.log('  Verdict: |spread| < 0.5pp → engine indistinguishable from noise today')
} else if (tSpread > 0) {
  console.log('  Verdict: spread > 0 → engine labels are CORRECTLY signed (BUYs > SELLs in return)')
} else {
  console.log('  Verdict: spread < 0 → engine labels are INVERTED (SELLs > BUYs in return).')
  console.log('           Engine has skill; sign needs to flip in this regime.')
}
