/**
 * Live Solana whale feed for the Frontier page.
 * =============================================================================
 * 2026-10-01: the Frontier page only read tracked_address_transfers for the
 * ~190 Arkham-harvested Solana addresses — which turned out to be dormant
 * (148 never produced a row; the rest last moved in July). Meanwhile the
 * Railway whale monitor writes ~1.7k labelled Solana whale transfers a day
 * to solana_transactions (fresh to the minute). This maps those rows onto the
 * page's transfer shape so the tiles, feed, movers, rotation and CEX-flow
 * signals have live data; tracked-wallet rows are merged in when present.
 */
import { supabaseAdmin, supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import { resolveToken } from '@/app/frontier/splTokens'

const CEX_RE = /\b(binance|coinbase|kraken|okx|bybit|bitget|kucoin|gate\.?io|htx|huobi|mexc|crypto\.com|bitstamp|gemini|bitfinex|upbit|bithumb|hot wallet|exchange|cex)\b/i
const MM_RE = /\b(market maker|wintermute|jump|gsr|cumberland|flow traders|dwf|amber)\b/i
const FUND_RE = /\b(fund|capital|ventures|vc|alameda|a16z|paradigm|multicoin|polychain)\b/i

export function shortSol(addr) {
  const a = String(addr || '')
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a
}

export function entityTypeFromLabel(label) {
  const l = String(label || '')
  if (!l) return null
  if (CEX_RE.test(l)) return 'cex'
  if (MM_RE.test(l)) return 'market-maker'
  if (FUND_RE.test(l)) return 'fund'
  return 'whale'
}

/** Raw rows from solana_transactions (newest first; the table is time-indexed). */
export async function fetchSolanaWhaleRows({ sinceIso, limit = 3000 }) {
  const { data, error } = await supabaseAdmin
    .from('solana_transactions')
    .select('transaction_hash, timestamp, token_symbol, usd_value, classification, whale_address, from_address, to_address, from_label, to_label, is_cex_transaction, counterparty_address, counterparty_type')
    .gte('timestamp', sinceIso)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`solana_transactions: ${error.message}`)
  return data || []
}

/**
 * Timestamp of the newest solana_transactions row (null when the table is
 * empty). Tells "the feed is quiet" apart from "the feed has stopped": when
 * Alchemy's monthly cap cut the Railway monitor's gRPC stream on 2026-10-03
 * the page said "warming up" for two days. Constant URL, so it goes through
 * the no-store client (Vercel Data Cache pin).
 */
export async function fetchSolanaWhaleNewestAt() {
  const { data, error } = await supabaseAdminFresh
    .from('solana_transactions')
    .select('timestamp')
    .order('timestamp', { ascending: false })
    .limit(1)
  if (error) throw new Error(`solana_transactions newest: ${error.message}`)
  return data?.[0]?.timestamp || null
}

/**
 * Map a whale-feed row to the Frontier transfer shape (same fields the
 * tracked-wallet enrichRow produces). BUY = the whale received the token
 * (direction 'in'), SELL = it sent it ('out').
 */
export function whaleRowToTransfer(r) {
  const isBuy = String(r.classification || '').toUpperCase().startsWith('BUY')
  const whaleLabel = isBuy ? r.to_label : r.from_label
  const counterpartyLabel = isBuy ? r.from_label : r.to_label
  const tok = resolveToken(r.token_symbol)
  const usd = Number(r.usd_value) || 0
  const entity = whaleLabel && whaleLabel !== 'unknown' ? whaleLabel : `Whale ${shortSol(r.whale_address)}`
  return {
    id: `wf-${r.transaction_hash}-${r.whale_address}`,
    time: r.timestamp,
    entity,
    entityType: entityTypeFromLabel(whaleLabel) || 'whale',
    label: whaleLabel || null,
    direction: isBuy ? 'in' : 'out',
    token: tok.symbol || r.token_symbol,
    tokenKind: tok.kind,
    amount: null,
    amountUsd: usd,
    counterparty: r.counterparty_address || (isBuy ? r.from_address : r.to_address) || null,
    counterpartyLabel: counterpartyLabel && counterpartyLabel !== 'unknown' ? counterpartyLabel : null,
    counterpartyType: entityTypeFromLabel(counterpartyLabel),
    txHash: r.transaction_hash,
    address: r.whale_address,
    chain: 'solana',
    source: 'whale_feed',
  }
}

/**
 * CEX-side view for the signals route: one row per CEX leg. A CEX-labelled
 * whale buying = tokens into the CEX ('in'); a whale selling to a CEX
 * counterparty = deposit into that CEX ('in'); the mirror cases are 'out'.
 */
export function whaleRowToCexLeg(r) {
  const t = whaleRowToTransfer(r)
  if (t.entityType === 'cex') {
    return { time: t.time, entity: t.entity, isCex: true, direction: t.direction, token: t.token, tokenKind: t.tokenKind, amountUsd: t.amountUsd }
  }
  if (t.counterpartyType === 'cex' && t.counterpartyLabel) {
    // whale SELL (out) → the CEX received → 'in'; whale BUY (in) → the CEX sent → 'out'
    return { time: t.time, entity: t.counterpartyLabel, isCex: true, direction: t.direction === 'out' ? 'in' : 'out', token: t.token, tokenKind: t.tokenKind, amountUsd: t.amountUsd }
  }
  return { time: t.time, entity: t.entity, isCex: false, direction: t.direction, token: t.token, tokenKind: t.tokenKind, amountUsd: t.amountUsd }
}
