/**
 * GET /api/frontier/signals
 *
 * Turns the raw `tracked_address_transfers` feed into actionable
 * BUY / SELL / NEUTRAL calls per token, scoped to Solana.
 *
 * Heuristic (deterministic, no LLM):
 *   - Aggregate the last `WINDOW_HOURS` of enriched transfers per token.
 *   - For each token group, split flow by entity-type (CEX vs other).
 *   - CEX inflows of the asset  = supply hitting orderbooks  → bearish
 *     CEX outflows of the asset = withdrawn to self-custody  → bullish
 *   - Stables flip the sign: stable INFLOWS to CEX hot wallets are
 *     dry-powder being parked to buy → mildly bullish for risk assets;
 *     stable OUTFLOWS suggest deploy-into-DeFi (also bullish-ish).
 *   - Confidence scales with |net USD|, distinct-entity count and
 *     sample size; capped 30–95.
 *   - Signals with |net| < MIN_SIGNAL_USD are dropped so we only show
 *     things a trader could actually act on.
 *
 * Outcomes for these signals are written into `signal_outcomes` by the
 * existing accuracy watchdog cron (it picks up rows where source =
 * 'frontier-solana'); no schema change required.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { resolveToken, ENRICHABLE_TICKERS } from '@/app/frontier/splTokens'
import { isAuthorized } from '@/app/api/frontier/_auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const WINDOW_HOURS = 4
const MIN_SIGNAL_USD = 75_000   // a signal needs ≥ $75k of net flow to publish
const MAX_SIGNALS = 6

async function loadPriceMap() {
  const tickers = Array.from(ENRICHABLE_TICKERS)
  const { data } = await supabaseAdmin
    .from('price_snapshots')
    .select('ticker, price_usd, timestamp')
    .in('ticker', tickers)
    .order('timestamp', { ascending: false })
    .limit(500)
  const out = new Map()
  for (const row of data || []) {
    if (!out.has(row.ticker)) out.set(row.ticker, Number(row.price_usd) || 0)
  }
  return out
}

function enrichRow(row, priceMap) {
  const tok = resolveToken(row.token_symbol)
  let usd = Number(row.amount_usd)
  if (!Number.isFinite(usd) || usd <= 0) {
    let price = tok.priceUsd
    if (price == null) price = priceMap.get(tok.symbol) || null
    const amt = Number(row.amount)
    usd = (Number.isFinite(amt) && price && Number.isFinite(price)) ? amt * price : 0
  }
  const isCex = /cex|custodian/i.test(row.arkham_entity_type || '')
  return {
    time: row.timestamp,
    entity: row.arkham_entity_name,
    isCex,
    direction: row.direction,
    token: tok.symbol,
    tokenKind: tok.kind,
    amountUsd: usd,
  }
}

function fmtUsd(n) {
  const v = Math.abs(Number(n) || 0)
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 10_000) return `$${(v / 1_000).toFixed(0)}k`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function buildSignal(token, tokenKind, rows) {
  // CEX-side aggregation only — that's where supply/demand actually meets price.
  let cexIn = 0, cexOut = 0
  const inEntities = new Map()
  const outEntities = new Map()
  for (const r of rows) {
    if (!r.isCex || !r.amountUsd) continue
    if (r.direction === 'in') {
      cexIn += r.amountUsd
      inEntities.set(r.entity, (inEntities.get(r.entity) || 0) + r.amountUsd)
    } else {
      cexOut += r.amountUsd
      outEntities.set(r.entity, (outEntities.get(r.entity) || 0) + r.amountUsd)
    }
  }
  const cexNet = cexIn - cexOut    // positive = net deposits (bearish for risk asset)
  const absNet = Math.abs(cexNet)
  if (absNet < MIN_SIGNAL_USD) return null

  // Direction:
  //   risk asset → CEX inflows bearish, outflows bullish
  //   stable     → CEX inflows mildly bullish (dry powder), outflows neutral-bullish
  let direction
  if (tokenKind === 'stable') {
    direction = cexNet > 0 ? 'BULLISH' : 'NEUTRAL'
  } else {
    direction = cexNet > 0 ? 'BEARISH' : 'BULLISH'
  }

  const distinctEntities = new Set([...inEntities.keys(), ...outEntities.keys()]).size
  const sampleSize = rows.filter((r) => r.isCex).length

  // Confidence: log-scale on $, plus boost from breadth and sample size.
  let conf = 25 + Math.log10(absNet / 10_000) * 18 + Math.min(distinctEntities * 4, 18) + Math.min(sampleSize / 5, 12)
  conf = Math.max(30, Math.min(95, Math.round(conf)))

  // Reasoning: top contributors on the dominant side.
  const dominant = cexNet > 0 ? inEntities : outEntities
  const dominantLabel = cexNet > 0 ? 'depositing' : 'withdrawing'
  const top = [...dominant.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e, v]) => `${e} ${fmtUsd(v)}`)

  const ratio = (cexIn && cexOut)
    ? (cexIn > cexOut ? `${(cexIn / cexOut).toFixed(1)}× more in than out` : `${(cexOut / cexIn).toFixed(1)}× more out than in`)
    : (cexIn ? 'one-sided inflow' : 'one-sided outflow')

  let thesis
  if (tokenKind === 'stable') {
    thesis = direction === 'BULLISH'
      ? `Stables piling onto exchanges (${fmtUsd(cexIn)} in vs ${fmtUsd(cexOut)} out) — that's dry powder being staged to buy risk assets.`
      : `Stables flowing off exchanges into self-custody / DeFi — usually neutral, watch token-specific flow for the actual buy.`
  } else if (direction === 'BEARISH') {
    thesis = `${distinctEntities} CEX desks net-deposited ${fmtUsd(absNet)} of ${token} in the last ${WINDOW_HOURS}h (${ratio}). Deposits at this scale typically precede sell-side pressure — fade strength or hedge.`
  } else {
    thesis = `${distinctEntities} CEX desks net-withdrew ${fmtUsd(absNet)} of ${token} in the last ${WINDOW_HOURS}h (${ratio}). Withdrawals of this size are usually accumulation moving to cold storage — supply tightening into any rally.`
  }

  return {
    token,
    tokenKind,
    direction,
    confidence: conf,
    netUsd: cexNet,                 // signed (+ = into CEX)
    cexIn,
    cexOut,
    distinctEntities,
    sampleSize,
    thesis,
    contributors: top,
    contributorsLabel: dominantLabel,
    windowHours: WINDOW_HOURS,
  }
}

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString()
  const [winRes, priceMap] = await Promise.all([
    supabaseAdmin
      .from('tracked_address_transfers')
      .select('timestamp, address, direction, token_symbol, amount, amount_usd, arkham_entity_name, arkham_entity_type')
      .eq('chain', 'solana')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(5000),
    loadPriceMap(),
  ])
  if (winRes.error) {
    return NextResponse.json({ error: winRes.error.message }, { status: 500 })
  }
  const enriched = (winRes.data || []).map((r) => enrichRow(r, priceMap))

  // Group by token symbol.
  const byToken = new Map()
  for (const r of enriched) {
    if (!r.token) continue
    if (!byToken.has(r.token)) byToken.set(r.token, { kind: r.tokenKind, rows: [] })
    byToken.get(r.token).rows.push(r)
  }

  const signals = []
  for (const [token, { kind, rows }] of byToken.entries()) {
    const s = buildSignal(token, kind, rows)
    if (s) signals.push(s)
  }
  signals.sort((a, b) => b.confidence - a.confidence)
  const top = signals.slice(0, MAX_SIGNALS)

  // NOTE: not writing into `signal_outcomes` — that table requires
  // price_at_signal / eval_window / token_signals FK that this read-only
  // route doesn't own. A future migration can add a dedicated
  // `frontier_signals` table + watchdog to score these calls.

  return NextResponse.json(
    {
      signals: top,
      windowHours: WINDOW_HOURS,
      minSignalUsd: MIN_SIGNAL_USD,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=60' } },
  )
}
