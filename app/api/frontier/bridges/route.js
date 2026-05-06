/**
 * GET /api/frontier/bridges
 *
 * Returns the most recent "rotating into Solana" bridge events: tracked
 * entities receiving value via known Solana bridge programs in the last
 * 24h. Pairs with the bridge cards on /frontier.
 *
 * Detection rule: chain='solana' AND direction='in' AND counterparty IN
 * (known bridge addresses). The bridge map is hand-curated in
 * `app/frontier/bridges.js` — extending it is the only way to recognise
 * new bridges. PDAs are deliberately NOT matched.
 *
 * ORCA explanation: a deterministic one-sentence summary is generated
 * from the row data (entity type + amount + bridge + token). We
 * intentionally avoid an OpenAI call on every page load — the existing
 * ORCA pipeline can be wired in by replacing buildOrcaNote() if needed.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { BRIDGE_ADDRESSES, bridgeNameFor } from '@/app/frontier/bridges'
import { isAuthorized } from '@/app/api/frontier/_auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const BRIDGE_LIMIT = 12
const LOOKBACK_HOURS = 24

function fmtAmount(n) {
  if (!Number.isFinite(Number(n))) return ''
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`
  return num.toFixed(2)
}

/**
 * Deterministic one-sentence note explaining the rotation. Designed to
 * read like an ORCA snippet without paying for OpenAI tokens. The first
 * clause names the entity type's typical behavior; the second clause
 * states the observed move. Swap with a real OpenAI call later if you
 * want LLM-generated copy here.
 */
function buildOrcaNote({ entity, entityType, bridge, token, amountUsd }) {
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
  return `${e} ${context}. Just received ${usdStr}${tok} on Solana via ${bridge}.`
}

export async function GET(req) {
  const authed = await isAuthorized(req)
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('tracked_address_transfers')
    .select('id, timestamp, address, direction, token_symbol, amount, amount_usd, tx_hash, counterparty, arkham_entity_name, arkham_entity_type, arkham_label')
    .eq('chain', 'solana')
    .eq('direction', 'in')
    .in('counterparty', BRIDGE_ADDRESSES)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(BRIDGE_LIMIT)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = (data || []).map((r) => {
    const bridge = bridgeNameFor(r.counterparty) || 'Unknown bridge'
    return {
      id: r.id,
      time: r.timestamp,
      entity: r.arkham_entity_name,
      entityType: r.arkham_entity_type,
      label: r.arkham_label,
      address: r.address,
      bridge,
      token: r.token_symbol,
      amount: r.amount,
      amountUsd: r.amount_usd,
      txHash: r.tx_hash,
      orca: buildOrcaNote({
        entity: r.arkham_entity_name,
        entityType: r.arkham_entity_type,
        bridge,
        token: r.token_symbol,
        amountUsd: r.amount_usd,
      }),
    }
  })

  return NextResponse.json(
    { events, lookbackHours: LOOKBACK_HOURS, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  )
}
