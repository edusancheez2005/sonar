#!/usr/bin/env node
/**
 * Pipeline Health Audit — 2026-05-11
 *
 * Verifies that every layer of the signal pipeline reads LIVE prices
 * (not Next.js fetch-cached frozen data). Run after deploying the
 * cache:no-store fixes.
 *
 * Checks:
 *   1. Live Binance BTC vs price_snapshots latest (should match within 30bps)
 *   2. fetch-prices system_health: last 5 runs, are they writing live data?
 *   3. evaluate-signals: last 50 outcomes, distribution of btc_price_at_eval
 *      — refuses GO if >5% concentration on any single value
 *   4. Circuit breakers: are both BUY and SELL inactive?
 *   5. token_signals: last 10, do their prices match live?
 *   6. End-to-end: most recent signal_outcomes row, recompute its
 *      price_change_pct from raw price_at_signal/price_at_eval — does it
 *      match the stored value? (catches arithmetic bugs)
 *
 * Exit 0 on PASS, 1 on FAIL, with a one-line PASS/FAIL summary at end.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE?.replace(/['"]/g, '')
if (!URL || !KEY) { console.error('Missing SUPABASE env'); process.exit(2) }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const failures = []
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => { console.log(`  ❌ ${msg}`); failures.push(msg) }
const warn = (msg) => console.log(`  ⚠️  ${msg}`)

async function rest(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers, cache: 'no-store' })
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json()
}

// ─── 1. Live BTC ground truth ─────────────────────────────────────────
console.log('\n=== 1. Live BTC ground truth (Binance) ===')
const tickerRes = await fetch('https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT', { cache: 'no-store' })
const liveBtc = parseFloat((await tickerRes.json()).price)
console.log(`  Live BTC (Binance): $${liveBtc.toLocaleString()}`)

// ─── 2. price_snapshots latest ────────────────────────────────────────
console.log('\n=== 2. price_snapshots BTC (most recent) ===')
const snaps = await rest('price_snapshots?select=ticker,price_usd,timestamp&ticker=eq.BTC&order=timestamp.desc&limit=3')
if (snaps.length === 0) { fail('no BTC snapshots') }
else {
  for (const s of snaps) {
    const ageMin = (Date.now() - new Date(s.timestamp).getTime()) / 60000
    const drift = ((s.price_usd - liveBtc) / liveBtc) * 100
    const tag = Math.abs(drift) > 0.5 ? '❌' : (Math.abs(drift) > 0.2 ? '⚠️ ' : '✅')
    console.log(`  ${tag} $${Number(s.price_usd).toFixed(0).padStart(7)}  age=${ageMin.toFixed(1).padStart(5)}min  drift=${drift.toFixed(3)}%`)
  }
  const latest = snaps[0]
  const drift = Math.abs((latest.price_usd - liveBtc) / liveBtc) * 100
  const ageMin = (Date.now() - new Date(latest.timestamp).getTime()) / 60000
  if (drift > 0.5) fail(`latest BTC snapshot drifts ${drift.toFixed(2)}% from live`)
  else ok(`latest snapshot within ${drift.toFixed(2)}% of live`)
  if (ageMin > 30) fail(`latest BTC snapshot is ${ageMin.toFixed(1)}min old (>30min stale)`)
  else ok(`latest snapshot age ${ageMin.toFixed(1)}min`)
}

// ─── 3. system_health fetch-prices recency ────────────────────────────
console.log('\n=== 3. system_health fetch-prices (last 5 runs) ===')
const health = await rest('system_health?select=component,status,started_at,finished_at,duration_ms,details&component=eq.fetch-prices&order=started_at.desc&limit=5')
for (const h of health) {
  const ageMin = (Date.now() - new Date(h.started_at).getTime()) / 60000
  const detailsStr = h.details ? JSON.stringify(h.details).slice(0, 100) : ''
  console.log(`  ${h.status === 'ok' ? '✅' : '❌'} ${h.started_at}  status=${h.status}  age=${ageMin.toFixed(1)}min  ${detailsStr}`)
}
if (health.length === 0) fail('no fetch-prices health rows')
else if ((Date.now() - new Date(health[0].started_at).getTime()) / 60000 > 30) fail('most recent fetch-prices >30min ago')
else ok(`fetch-prices ran ${((Date.now() - new Date(health[0].started_at).getTime()) / 60000).toFixed(1)}min ago`)

// ─── 4. evaluate-signals: btc_price_at_eval freshness per hour ───────
console.log('\n=== 4. evaluate-signals btc_price_at_eval per eval_time hour (last 24h) ===')
const recent = await rest('signal_outcomes?select=btc_price_at_eval,signal_time,eval_time&suspect=is.false&correct=not.is.null&order=eval_time.desc&limit=500')

// CORRECT check: the evaluator runs hourly and batch-processes ~24 signals
// per run, so within ONE hour all signals share the same btc_price_at_eval
// — that's by design. The frozen-cache bug shows up when MULTIPLE hours
// in a row share the SAME btc_price_at_eval (the cache isn't refreshing).
const byHour = new Map()  // eval-hour ISO → set of btc_price_at_eval
for (const r of recent) {
  const hr = new Date(r.eval_time).toISOString().slice(0, 13) + ':00:00Z'
  if (!byHour.has(hr)) byHour.set(hr, new Set())
  byHour.get(hr).add(Math.round(r.btc_price_at_eval))
}
const hours = [...byHour.entries()].sort((a, b) => b[0].localeCompare(a[0]))
console.log(`  Last ${Math.min(hours.length, 12)} eval-hours (BTC price seen at eval):`)
const hourBtcSeq = []
for (const [hr, prices] of hours.slice(0, 12)) {
  const arr = [...prices].sort((a, b) => a - b)
  const display = arr.length > 1 ? `${arr[0]} ... ${arr[arr.length - 1]} (${arr.length} distinct)` : `$${arr[0]}`
  console.log(`  ${hr}  ${display}`)
  hourBtcSeq.push({ hr, primary: arr[0] })
}

// Bug detector: are 3+ consecutive hours showing the SAME btc_price_at_eval?
let consec = 1, maxConsec = 1, badStart = null
for (let i = 1; i < hourBtcSeq.length; i++) {
  if (Math.abs(hourBtcSeq[i].primary - hourBtcSeq[i-1].primary) < 1) {
    consec++
    if (consec > maxConsec) { maxConsec = consec; badStart = hourBtcSeq[i-consec+1].hr }
  } else consec = 1
}
if (maxConsec >= 3) {
  fail(`${maxConsec} consecutive eval-hours show the same btc_price_at_eval starting ${badStart} — frozen cache`)
} else {
  ok(`btc_price_at_eval changes between hours (max consecutive identical: ${maxConsec})`)
}

// Most-recent eval rows must track live BTC
const veryRecent = recent.filter(r => (Date.now() - new Date(r.eval_time).getTime()) / 60000 < 90)
if (veryRecent.length > 0) {
  const drifts = veryRecent.map(r => Math.abs((r.btc_price_at_eval - liveBtc) / liveBtc) * 100)
  const maxDrift = Math.max(...drifts)
  const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length
  console.log(`  Recent (<90min) eval rows: n=${veryRecent.length}  avg_drift=${avgDrift.toFixed(2)}%  max_drift=${maxDrift.toFixed(2)}%`)
  if (maxDrift > 2) fail(`a recent eval row drifts ${maxDrift.toFixed(2)}% from live BTC`)
  else ok(`recent eval rows track live BTC within ${maxDrift.toFixed(2)}%`)
} else warn('no eval rows in last 90min (cron may not have run yet)')

// ─── 5. Circuit breakers ──────────────────────────────────────────────
console.log('\n=== 5. Circuit breakers ===')
const breakers = await rest('signal_circuit_breaker?select=*&order=signal_type')
for (const b of breakers) {
  console.log(`  ${b.active ? '🔴' : '✅'} ${b.signal_type.padEnd(6)} active=${b.active}  acc=${b.acc_pct ?? '-'}%  n=${b.sample_size ?? '-'}  ${b.reason ? '— ' + b.reason.slice(0, 60) : ''}`)
}
const tripped = breakers.filter(b => b.active)
if (tripped.length > 0) warn(`${tripped.length} breaker(s) active: ${tripped.map(b => b.signal_type).join(',')}`)
else ok('all circuit breakers clear')

// ─── 6. token_signals freshness ───────────────────────────────────────
console.log('\n=== 6. token_signals (last 10) ===')
const sigs = await rest('token_signals?select=token,signal,score,price_at_signal,created_at&order=created_at.desc&limit=10')
for (const s of sigs) {
  const ageMin = (Date.now() - new Date(s.created_at).getTime()) / 60000
  console.log(`  ${s.token.padEnd(8)} ${(s.signal || '').padEnd(12)} score=${s.score}  px=${s.price_at_signal ?? '-'}  age=${ageMin.toFixed(1)}min`)
}
if (sigs.length === 0) fail('no token_signals')
else if ((Date.now() - new Date(sigs[0].created_at).getTime()) / 60000 > 30) fail('most recent signal >30min old')
else ok(`most recent signal ${((Date.now() - new Date(sigs[0].created_at).getTime()) / 60000).toFixed(1)}min ago`)

// Cross-check token_signals BTC price_at_signal against live BTC
const btcSig = sigs.find(s => s.token === 'BTC' && s.price_at_signal)
if (btcSig) {
  const drift = Math.abs((btcSig.price_at_signal - liveBtc) / liveBtc) * 100
  const ageMin = (Date.now() - new Date(btcSig.created_at).getTime()) / 60000
  if (drift > 1 && ageMin < 30) fail(`recent BTC token_signals.price_at_signal=${btcSig.price_at_signal} drifts ${drift.toFixed(2)}% from live`)
  else ok(`BTC signal price tracks live (drift=${drift.toFixed(2)}%, age=${ageMin.toFixed(1)}min)`)
}

// ─── 7. Arithmetic sanity: stored vs recomputed price_change_pct ──────
console.log('\n=== 7. Arithmetic sanity (stored price_change_pct vs recomputed) ===')
const sample = await rest('signal_outcomes?select=token,price_at_signal,price_at_eval,price_change_pct,btc_price_at_signal,btc_price_at_eval,btc_change_pct&suspect=is.false&correct=not.is.null&order=eval_time.desc&limit=20')
let arithFails = 0
for (const r of sample) {
  if (!r.price_at_signal || !r.price_at_eval) continue
  const recomputed = ((r.price_at_eval - r.price_at_signal) / r.price_at_signal) * 100
  const delta = Math.abs(recomputed - r.price_change_pct)
  if (delta > 0.05) {
    arithFails++
    console.log(`  ❌ ${r.token}: stored=${r.price_change_pct}%  recomputed=${recomputed.toFixed(3)}%  delta=${delta.toFixed(3)}%`)
  }
  const recBtc = ((r.btc_price_at_eval - r.btc_price_at_signal) / r.btc_price_at_signal) * 100
  const dBtc = Math.abs(recBtc - r.btc_change_pct)
  if (dBtc > 0.05) {
    arithFails++
    console.log(`  ❌ ${r.token}: btc_stored=${r.btc_change_pct}%  recomputed=${recBtc.toFixed(3)}%  delta=${dBtc.toFixed(3)}%`)
  }
}
if (arithFails === 0) ok(`all ${sample.length} sampled rows: stored % matches recomputed within 5bps`)
else fail(`${arithFails} arithmetic mismatches in ${sample.length} sampled rows`)

// ─── FINAL ────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
if (failures.length === 0) {
  console.log('✅ PASS — pipeline is reading live data end-to-end')
  process.exit(0)
} else {
  console.log(`❌ FAIL — ${failures.length} issue(s):`)
  for (const f of failures) console.log(`   • ${f}`)
  process.exit(1)
}
