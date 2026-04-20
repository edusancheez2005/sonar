/**
 * Information Coefficient (IC) Audit
 *
 * The single most important pre-build quant primitive: do our raw signal
 * inputs actually have predictive power on forward returns? If the IC is
 * noise, no amount of weighted-sum / tanh / threshold tuning will help.
 *
 * For each candidate feature X (tier1..4 scores, composite score,
 * confidence) and each forward-return horizon H (1h, 6h, 24h):
 *
 *   1. Join token_signals -> signal_outcomes on signal_id.
 *   2. Compute Spearman rank correlation between X and forward return,
 *      both raw and BTC-benchmark-adjusted (alpha).
 *   3. Aggregate IC per token, then summarise:
 *        mean IC, stdev IC, IR = mean / stdev (Sharpe analogue for IC),
 *        hit rate (% of tokens with same-sign IC).
 *
 * Decision rules (Grinold & Kahn, "Active Portfolio Management"):
 *   |mean IC| < 0.01           -> noise. Drop the feature.
 *   |mean IC| in [0.02, 0.05]  -> marginal. Only useful in ensembles.
 *   |mean IC| > 0.05           -> real edge.
 *   IR > 0.5                   -> reliable.
 *   IR < 0.2                   -> too noisy to trade.
 *
 * Usage:
 *   node scripts/ic_audit.js                # last 30 days, alpha labels
 *   node scripts/ic_audit.js 14 raw         # last 14 days, raw returns
 *   node scripts/ic_audit.js 30 alpha 24h   # one horizon only
 *
 * Read-only.
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

// ─── CLI args ────────────────────────────────────────────────────────────
const DAYS = parseInt(process.argv[2] || '30', 10)
const LABEL_KIND = (process.argv[3] || 'alpha').toLowerCase()  // 'alpha' | 'raw'
const HORIZON_FILTER = process.argv[4] || null                  // '1h'|'6h'|'24h'|null

const FEATURES = ['score', 'tier1_score', 'tier2_score', 'tier3_score', 'tier4_score', 'confidence']
const HORIZONS = HORIZON_FILTER ? [HORIZON_FILTER] : ['1h', '6h', '24h']

// Min outcomes per token before we trust a per-token IC
const MIN_PER_TOKEN = 10
// Min token count before we trust the aggregate IC
const MIN_TOKEN_COUNT = 4

// ─── Stats helpers (pure JS, no deps) ────────────────────────────────────
function ranks(arr) {
  // Average rank for ties — standard Spearman convention.
  const indexed = arr.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const out = new Array(arr.length)
  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++
    const avgRank = (i + j) / 2 + 1  // 1-indexed avg
    for (let k = i; k <= j; k++) out[indexed[k].i] = avgRank
    i = j + 1
  }
  return out
}

function pearson(x, y) {
  const n = x.length
  if (n < 3) return null
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i] }
  const mx = sx / n, my = sy / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my
    num += a * b; dx += a * a; dy += b * b
  }
  const den = Math.sqrt(dx * dy)
  if (den === 0) return null
  return num / den
}

function spearman(x, y) {
  // Strip pairs where either side is null/NaN
  const px = [], py = []
  for (let i = 0; i < x.length; i++) {
    const a = Number(x[i]), b = Number(y[i])
    if (Number.isFinite(a) && Number.isFinite(b)) { px.push(a); py.push(b) }
  }
  if (px.length < 3) return null
  return pearson(ranks(px), ranks(py))
}

function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null }
function stdev(a) {
  if (a.length < 2) return null
  const m = mean(a)
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1))
}
function fmt(x, d = 4) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '   —  '
  return (x >= 0 ? ' ' : '') + x.toFixed(d)
}

// IC interpretation labels
function gradeIC(absMean) {
  if (absMean < 0.01) return 'noise'
  if (absMean < 0.02) return 'weak'
  if (absMean < 0.05) return 'marginal'
  if (absMean < 0.10) return 'good'
  return 'strong'
}
function gradeIR(absIR) {
  if (absIR < 0.2) return 'unreliable'
  if (absIR < 0.5) return 'usable'
  if (absIR < 1.0) return 'good'
  return 'excellent'
}

// ─── Data load ───────────────────────────────────────────────────────────
async function loadJoined(daysBack) {
  const since = new Date(Date.now() - daysBack * 86400 * 1000).toISOString()

  // Pull signals in pages — Supabase caps PostgREST queries at 1000 rows.
  const sigById = new Map()
  let page = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('token_signals')
      .select('id, token, score, raw_score, confidence, tier1_score, tier2_score, tier3_score, tier4_score, computed_at')
      .gte('computed_at', since)
      .order('computed_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error) { console.error('signals query failed:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    for (const s of data) sigById.set(s.id, s)
    if (data.length < PAGE) break
    page++
    if (page > 50) break // hard guard, 50k signals is way more than 30 days
  }
  console.log(`Loaded ${sigById.size} signals.`)

  // Pull outcomes in chunks, joined by signal_id.
  const ids = [...sigById.keys()]
  const outcomes = []
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { data: rows, error: oErr } = await supabase
      .from('signal_outcomes')
      .select('signal_id, eval_window, price_change_pct, alpha_pct, correct, btc_change_pct')
      .in('signal_id', chunk)
    if (oErr) { console.error('outcomes query failed:', oErr.message); process.exit(1) }
    if (rows) outcomes.push(...rows)
  }
  console.log(`Loaded ${outcomes.length} outcomes.`)

  // Join. Skip rows where the move is below the noise floor — those are
  // data-feed gaps, not real outcomes, and they pollute IC with zeros.
  const NOISE_FLOOR_PCT = 0.05
  const joined = []
  for (const o of outcomes) {
    const s = sigById.get(o.signal_id)
    if (!s) continue
    const labelRaw = Number(o.price_change_pct)
    const labelAlpha = (o.alpha_pct === null || o.alpha_pct === undefined)
      ? null : Number(o.alpha_pct)
    if (!Number.isFinite(labelRaw)) continue
    if (Math.abs(labelRaw) < NOISE_FLOOR_PCT) continue
    joined.push({
      token: s.token,
      window: o.eval_window,
      score: s.score, raw_score: s.raw_score, confidence: s.confidence,
      tier1_score: s.tier1_score, tier2_score: s.tier2_score,
      tier3_score: s.tier3_score, tier4_score: s.tier4_score,
      label_raw: labelRaw,
      label_alpha: labelAlpha,
    })
  }
  return joined
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== IC Audit ===`)
  console.log(`Window: last ${DAYS} days`)
  console.log(`Label : ${LABEL_KIND === 'alpha' ? 'alpha vs BTC (price_change_pct - btc_change_pct)' : 'raw price_change_pct'}`)
  console.log(`Horizons: ${HORIZONS.join(', ')}\n`)

  const data = await loadJoined(DAYS)
  if (!data.length) { console.log('No joined rows. Bail.'); return }

  const labelKey = LABEL_KIND === 'alpha' ? 'label_alpha' : 'label_raw'
  // For alpha labels, drop rows missing benchmark.
  const usable = data.filter(d => Number.isFinite(d[labelKey]))
  console.log(`Usable rows after label filter: ${usable.length} / ${data.length}\n`)
  if (usable.length < 30) {
    console.log('⚠  <30 rows with this label. Re-run with `raw` or wait for the eval cron to backfill alpha.')
    if (LABEL_KIND === 'alpha') return
  }

  for (const horizon of HORIZONS) {
    const slice = usable.filter(d => d.window === horizon)
    console.log('─'.repeat(78))
    console.log(`Horizon: ${horizon}    (n=${slice.length})`)
    console.log('─'.repeat(78))
    if (slice.length < 30) {
      console.log('  ⚠  insufficient sample for this horizon, skipping.\n')
      continue
    }

    // Group by token for per-token ICs.
    const byToken = new Map()
    for (const r of slice) {
      if (!byToken.has(r.token)) byToken.set(r.token, [])
      byToken.get(r.token).push(r)
    }

    console.log(
      'feature'.padEnd(15) +
      'mean_IC'.padStart(10) +
      'std_IC'.padStart(10) +
      'IR'.padStart(8) +
      'hit_rate'.padStart(10) +
      'tokens'.padStart(8) +
      '   pooled_IC' +
      '   verdict'
    )

    for (const feat of FEATURES) {
      // Pooled (cross-sectional + time) IC
      const xs = slice.map(r => r[feat])
      const ys = slice.map(r => r[labelKey])
      const pooled = spearman(xs, ys)

      // Per-token ICs (only tokens with enough samples)
      const perToken = []
      for (const [tok, rows] of byToken) {
        if (rows.length < MIN_PER_TOKEN) continue
        const ic = spearman(rows.map(r => r[feat]), rows.map(r => r[labelKey]))
        if (ic !== null) perToken.push({ tok, ic, n: rows.length })
      }

      const ics = perToken.map(p => p.ic)
      const m = mean(ics)
      const s = stdev(ics)
      const ir = (m !== null && s && s > 0) ? m / s : null
      const sameSign = ics.length
        ? ics.filter(v => Math.sign(v) === Math.sign(m || 0)).length / ics.length
        : null
      const verdict = m === null
        ? '—'
        : `${gradeIC(Math.abs(m))} / ${ir === null ? '—' : gradeIR(Math.abs(ir))}`

      console.log(
        feat.padEnd(15) +
        fmt(m).padStart(10) +
        fmt(s).padStart(10) +
        fmt(ir, 2).padStart(8) +
        fmt(sameSign, 2).padStart(10) +
        String(perToken.length).padStart(8) +
        '   ' + fmt(pooled).padStart(10) +
        '   ' + verdict
      )
    }
    console.log()
    if ([...byToken.values()].filter(r => r.length >= MIN_PER_TOKEN).length < MIN_TOKEN_COUNT) {
      console.log(`  ⚠  Only ${[...byToken.values()].filter(r => r.length >= MIN_PER_TOKEN).length} tokens have >= ${MIN_PER_TOKEN} outcomes — IR is unreliable.\n`)
    }
  }

  console.log('─'.repeat(78))
  console.log('Decision guide:')
  console.log('  |mean IC| < 0.01            -> noise.    Drop or fix the feature.')
  console.log('  |mean IC| in [0.02, 0.05]   -> marginal. Only useful in ensembles.')
  console.log('  |mean IC| > 0.05            -> real edge.')
  console.log('  IR > 0.5                    -> reliable across tokens.')
  console.log('  hit_rate > 0.7              -> the sign of the IC is consistent across tokens.')
  console.log()
  console.log('Negative IC = your feature is anti-correlated with returns. Flip the sign.')
  console.log('Positive IC near zero with bouncing per-token signs = noise, not flippable.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
