/**
 * Signal Distribution Analysis
 *
 * Pulls the last N days of token_signals from Supabase and prints
 * histograms / cross-tabs that the dashboard accuracy endpoint can't show.
 *
 * Goal: figure out WHY headline accuracy is below 50% — is it
 *  (a) score-collapse from tanh-saturated tier scores (STRONG bands never fire)?
 *  (b) a sign-inversion in one tier (BUYs only firing into downtrends)?
 *  (c) regime bias (signals correct in trending markets, wrong in chop)?
 *
 * Usage:
 *   node scripts/analyze_signal_distribution.js          # last 30 days
 *   node scripts/analyze_signal_distribution.js 7        # last 7 days
 *   node scripts/analyze_signal_distribution.js 30 BTC   # last 30 days, single token
 *
 * Read-only. No writes to the DB.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DAYS = parseInt(process.argv[2] || '30', 10)
const TOKEN_FILTER = process.argv[3] ? process.argv[3].toUpperCase() : null

function histogram(values, bins) {
  const counts = new Array(bins.length - 1).fill(0)
  for (const v of values) {
    if (v === null || v === undefined || Number.isNaN(v)) continue
    for (let i = 0; i < bins.length - 1; i++) {
      if (v >= bins[i] && v < bins[i + 1]) { counts[i]++; break }
      if (i === bins.length - 2 && v === bins[bins.length - 1]) counts[i]++
    }
  }
  return counts
}

function printHistogram(label, values, bins) {
  const counts = histogram(values, bins)
  const max = Math.max(...counts, 1)
  console.log(`\n  ${label}  (n=${values.filter(v => v !== null && v !== undefined && !Number.isNaN(v)).length})`)
  for (let i = 0; i < counts.length; i++) {
    const lo = bins[i].toFixed(0).padStart(5)
    const hi = bins[i + 1].toFixed(0).padStart(5)
    const bar = '█'.repeat(Math.round((counts[i] / max) * 40))
    console.log(`    [${lo} .. ${hi})  ${String(counts[i]).padStart(5)}  ${bar}`)
  }
}

function pct(num, den) {
  if (!den) return '—'
  return `${(100 * num / den).toFixed(1)}%`
}

async function main() {
  const since = new Date(Date.now() - DAYS * 86400 * 1000).toISOString()
  console.log(`\n=== Signal Distribution Analysis ===`)
  console.log(`Window: last ${DAYS} days  (since ${since})`)
  if (TOKEN_FILTER) console.log(`Token: ${TOKEN_FILTER}`)

  // 1) Pull signals
  let q = supabase
    .from('token_signals')
    .select('id, token, signal, score, confidence, price_at_signal, computed_at')
    .gte('computed_at', since)
    .order('computed_at', { ascending: false })
    .limit(20000)
  if (TOKEN_FILTER) q = q.eq('token', TOKEN_FILTER)
  const { data: signals, error } = await q
  if (error) { console.error('Signals query failed:', error.message); process.exit(1) }
  console.log(`\nLoaded ${signals.length} signals.`)
  if (!signals.length) return

  // 2) Score histogram (overall) — looking for the gap that prevents
  //    >=72 (STRONG BUY) and <=28 (STRONG SELL) bands from ever firing.
  printHistogram(
    'SCORE distribution (0-100)',
    signals.map(s => Number(s.score)),
    [0, 10, 20, 28, 35, 43, 50, 57, 65, 72, 80, 90, 100],
  )

  // 3) Signal-type counts
  const byType = {}
  for (const s of signals) byType[s.signal] = (byType[s.signal] || 0) + 1
  console.log('\n  SIGNAL type counts')
  for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(12)} ${String(c).padStart(6)}  ${pct(c, signals.length)}`)
  }

  // 4) Outcomes for the same signals
  const ids = signals.map(s => s.id)
  // Chunk to avoid query size limits
  const outcomes = []
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { data: rows, error: oErr } = await supabase
      .from('signal_outcomes')
      .select('signal_id, signal_type, eval_window, price_change_pct, alpha_pct, beat_benchmark, correct, btc_change_pct, signal_time')
      .in('signal_id', chunk)
    if (oErr) { console.error('Outcomes query failed:', oErr.message); process.exit(1) }
    if (rows) outcomes.push(...rows)
  }
  console.log(`\nLoaded ${outcomes.length} outcomes for those signals.`)

  // 5) Per-window directional accuracy + alpha summary
  for (const w of ['1h', '6h', '24h']) {
    const wOut = outcomes.filter(o => o.eval_window === w && o.correct !== null)
    const wCorrect = wOut.filter(o => o.correct).length
    const wWithAlpha = wOut.filter(o => o.alpha_pct !== null && o.alpha_pct !== undefined)
    const wBeat = wWithAlpha.filter(o => o.beat_benchmark === true).length
    console.log(`\n  ${w} window:  n=${wOut.length}  acc=${pct(wCorrect, wOut.length)}  beat-BTC=${pct(wBeat, wWithAlpha.length)} (n=${wWithAlpha.length})`)
  }

  // 6) Per-signal-type directional accuracy AND beat-BTC rate
  console.log('\n  Per-signal-type accuracy & alpha:')
  for (const t of ['STRONG BUY', 'BUY', 'SELL', 'STRONG SELL']) {
    const tOut = outcomes.filter(o => o.signal_type === t && o.correct !== null)
    const tCorrect = tOut.filter(o => o.correct).length
    const tAlpha = tOut.filter(o => o.alpha_pct !== null && o.alpha_pct !== undefined)
    const tBeat = tAlpha.filter(o => o.beat_benchmark === true).length
    const meanAlpha = tAlpha.length
      ? tAlpha.reduce((s, o) => s + Number(o.alpha_pct), 0) / tAlpha.length
      : null
    console.log(
      `    ${t.padEnd(12)} n=${String(tOut.length).padStart(5)}  acc=${pct(tCorrect, tOut.length).padStart(6)}  ` +
      `beat-BTC=${pct(tBeat, tAlpha.length).padStart(6)}  mean_alpha=${meanAlpha === null ? '   —' : meanAlpha.toFixed(2) + '%'}`
    )
  }

  // 7) Cross-tab: BUY signals vs concurrent BTC trend at signal time.
  //    Hypothesis: BUYs are firing predominantly into BTC downtrends —
  //    "buying the dip" pattern that loses in trending bear regimes.
  const buys = outcomes.filter(
    o => (o.signal_type === 'BUY' || o.signal_type === 'STRONG BUY') &&
         o.btc_change_pct !== null && o.btc_change_pct !== undefined
  )
  if (buys.length) {
    let btcUp = 0, btcDown = 0, buyCorrectInUp = 0, buyCorrectInDown = 0
    for (const o of buys) {
      const inDowntrend = Number(o.btc_change_pct) < 0
      if (inDowntrend) {
        btcDown++
        if (o.correct) buyCorrectInDown++
      } else {
        btcUp++
        if (o.correct) buyCorrectInUp++
      }
    }
    console.log('\n  BUY signals × concurrent BTC trend (over their eval window):')
    console.log(`    BTC up    : n=${String(btcUp).padStart(5)}  buy-acc=${pct(buyCorrectInUp, btcUp)}`)
    console.log(`    BTC down  : n=${String(btcDown).padStart(5)}  buy-acc=${pct(buyCorrectInDown, btcDown)}`)
    if (btcDown > btcUp * 2) {
      console.log('    ⚠  BUYs are firing >2× more often in BTC downtrends than uptrends.')
      console.log('       Strongly suggests inverted whale-flow signal OR contrarian bias bug.')
    }
  }

  // 8) Mirror the same cross-tab for SELLs
  const sells = outcomes.filter(
    o => (o.signal_type === 'SELL' || o.signal_type === 'STRONG SELL') &&
         o.btc_change_pct !== null && o.btc_change_pct !== undefined
  )
  if (sells.length) {
    let btcUp = 0, btcDown = 0, sellCorrectInUp = 0, sellCorrectInDown = 0
    for (const o of sells) {
      const inDowntrend = Number(o.btc_change_pct) < 0
      if (inDowntrend) {
        btcDown++
        if (o.correct) sellCorrectInDown++
      } else {
        btcUp++
        if (o.correct) sellCorrectInUp++
      }
    }
    console.log('\n  SELL signals × concurrent BTC trend (over their eval window):')
    console.log(`    BTC up    : n=${String(btcUp).padStart(5)}  sell-acc=${pct(sellCorrectInUp, btcUp)}`)
    console.log(`    BTC down  : n=${String(btcDown).padStart(5)}  sell-acc=${pct(sellCorrectInDown, btcDown)}`)
  }

  // 9) Score histogram split by eventual correctness — does the score
  //    actually rank predictions from worst to best?
  const correctScores = outcomes.filter(o => o.correct === true).map(o => Number(o.signal_score))
  const wrongScores = outcomes.filter(o => o.correct === false).map(o => Number(o.signal_score))
  printHistogram('SCORE distribution | correct outcomes', correctScores, [0, 28, 43, 57, 72, 100])
  printHistogram('SCORE distribution | wrong outcomes',   wrongScores,   [0, 28, 43, 57, 72, 100])

  console.log('\n=== Done ===\n')
}

main().catch(err => { console.error(err); process.exit(1) })
