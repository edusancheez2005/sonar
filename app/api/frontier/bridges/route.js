/**
 * GET /api/frontier/bridges
 *
 * "Rotating Into Solana" — large inbound flows to tracked Solana
 * entities from non-tracked counterparties in the last 24h.
 *
 * Why not strictly bridge-program detection? Helius's parsed-tx feed
 * records the user wallet as `counterparty`, not the bridge program ID.
 * The hand-curated BRIDGE_ADDRESSES set therefore matched zero rows in
 * production. The actual bridge program shows up in tx instructions
 * (out of scope for this read-path).
 *
 * The pragmatic-and-honest substitute: surface the largest inbound USD
 * events to tracked CEX/fund/derivatives wallets that didn't come from
 * another tracked address. That captures fresh capital landing on
 * Solana — bridges, OTC desks, freshly-funded sub-accounts — which is
 * exactly what the panel set out to show.
 *
 * If a row's `counterparty` matches a known bridge program ID we still
 * tag it explicitly (`bridge: 'Wormhole'` etc.) so when bridge-tx
 * detection IS wired in later, the panel will pick it up automatically.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { BRIDGE_ADDRESSES, bridgeNameFor } from '@/app/frontier/bridges'
import { resolveToken, ENRICHABLE_TICKERS } from '@/app/frontier/splTokens'
import { isAuthorized } from '@/app/api/frontier/_auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const PANEL_LIMIT = 9            // 3x3 card grid
const LOOKBACK_HOURS = 24
const MIN_EVENT_USD = 5_000      // dust floor — only show meaningful capital

function fmtAmount(n) {
  if (!Number.isFinite(Number(n))) return ''
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`
  return num.toFixed(2)
}

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

function priceFor(tokenInfo, priceMap) {
  if (tokenInfo.priceUsd != null) return tokenInfo.priceUsd
  return priceMap.get(tokenInfo.symbol) || null
}

function buildOrcaNote({ entity, entityType, source, token, amountUsd }) {
  const e = entity || 'A tracked entity'
  const t = (entityType || '').toLowerCase()
  const tok = token || 'tokens'
  const usdStr = Number.isFinite(Number(amountUsd)) && Number(amountUsd) > 0
    ? `$${fmtAmount(amountUsd)} of `
    : ''
  let context
  if (t.includes('cex') || t.includes('custodian')) {
    context = `is an exchange/custodian; inbound flow this size on Solana usually precedes user withdrawals or market-maker rebalancing`
  } else if (t.includes('fund') || t === 'derivatives') {
    context = `is a fund/desk; inbound rotations into SOL are typically deployed into DEX LPs or perps within hours`
  } else if (t.includes('dex') || t.includes('aggregator')) {
    context = `is a DEX venue; inbound stables typically reflect routing inventory rather than directional bets`
  } else if (t.includes('bridge')) {
    context = `is itself bridge infrastructure — flow may be transit, not destination`
  } else {
    context = `is a tracked on-chain entity; the rotation is a directional signal worth pairing with their next on-chain move`
  }
  return `${e} ${context}. Just received ${usdStr}${tok} on Solana via ${source}.`
}

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  const [rowsRes, trackedRes, priceMap] = await Promise.all([
    supabaseAdmin
      .from('tracked_address_transfers')
      .select('id, timestamp, address, direction, token_symbol, amount, amount_usd, tx_hash, counterparty, arkham_entity_name, arkham_entity_type, arkham_label')
      .eq('chain', 'solana')
      .eq('direction', 'in')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(2000),
    // Build a set of tracked Solana addresses so we can EXCLUDE intra-
    // tracked transfers (Coinbase moving to its own hot wallet etc.)
    supabaseAdmin
      .from('tracked_address_universe')
      .select('address')
      .eq('chain', 'solana'),
    loadPriceMap(),
  ])

  if (rowsRes.error) {
    return NextResponse.json({ error: rowsRes.error.message }, { status: 500 })
  }

  const trackedSet = new Set((trackedRes.data || []).map((r) => r.address))
  const bridgeSet = new Set(BRIDGE_ADDRESSES)

  // Enrich + score each row.
  const enriched = (rowsRes.data || []).map((r) => {
    const tokenInfo = resolveToken(r.token_symbol)
    let usd = Number(r.amount_usd)
    if (!Number.isFinite(usd) || usd <= 0) {
      const price = priceFor(tokenInfo, priceMap)
      const amt = Number(r.amount)
      usd = (Number.isFinite(amt) && price) ? amt * price : 0
    }
    const isBridgeProgram = bridgeSet.has(r.counterparty)
    const sourceName = isBridgeProgram
      ? (bridgeNameFor(r.counterparty) || 'Bridge')
      : 'External wallet'
    return { ...r, tokenInfo, usd, isBridgeProgram, sourceName }
  })

  // Filter: meaningful USD + counterparty NOT in tracked set (= "external").
  const candidates = enriched
    .filter((r) => r.usd >= MIN_EVENT_USD)
    .filter((r) => r.counterparty && !trackedSet.has(r.counterparty))
    // Prefer bridge-tagged rows first, then by USD.
    .sort((a, b) => {
      if (a.isBridgeProgram !== b.isBridgeProgram) return a.isBridgeProgram ? -1 : 1
      return b.usd - a.usd
    })
    .slice(0, PANEL_LIMIT)

  const events = candidates.map((r) => ({
    id: r.id,
    time: r.timestamp,
    entity: r.arkham_entity_name,
    entityType: r.arkham_entity_type,
    label: r.arkham_label,
    address: r.address,
    bridge: r.sourceName,           // kept name for backward UI compat
    isBridgeProgram: r.isBridgeProgram,
    token: r.tokenInfo.symbol,
    amount: r.amount,
    amountUsd: r.usd,
    txHash: r.tx_hash,
    counterparty: r.counterparty,
    orca: buildOrcaNote({
      entity: r.arkham_entity_name,
      entityType: r.arkham_entity_type,
      source: r.sourceName,
      token: r.tokenInfo.symbol,
      amountUsd: r.usd,
    }),
  }))

  return NextResponse.json(
    {
      events,
      lookbackHours: LOOKBACK_HOURS,
      minEventUsd: MIN_EVENT_USD,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  )
}
