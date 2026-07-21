import 'server-only'
// Use the cacheable admin client (NOT ...Fresh): supabaseAdminFresh issues
// `cache: 'no-store'` fetches, which Next treats as a dynamic-render signal
// and forces the whole page to client-side render (empty SSR HTML). The
// cacheable client keeps these pages statically renderable / ISR-friendly,
// exactly like the working token page. Freshness comes from the 30s
// revalidate on the pages and force-dynamic on the API routes.
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

// Shared leaderboard aggregations. Called BOTH by the API routes (for the
// dashboard/client fetches) and directly by the server-rendered pages
// (/whales/leaderboard, /tokens).
//
// Aggregation happens IN THE DATABASE via RPC functions (see
// supabase/migrations/20260709_exact_aggregates.sql). This is the fix for the
// 2026-07-09 data-quality audit: PostgREST caps row fetches at 1,000, so the
// old "fetch rows, sum in JS" path silently ranked whales from ~7% of a busy
// day's transactions. If the RPC is missing (code deployed before the SQL was
// run), we fall back to the legacy JS aggregation so nothing breaks.

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

// Protocol-scale sanity cap, same as ORCA's getWhaleFlows/getTrendingWhales:
// no tradeable whale moves >$150M in ONE transaction — those rows are vault/
// bridge contracts the ingestion classifier mislabels as BUYs (e.g. the
// 0xbbbb… vanity contract receiving ~$308M WBTC hourly, which topped the
// leaderboard with $3.7B of fake daily "buys").
const MAX_SANE_TX_USD = 150_000_000
// Aggregate-level guard for the RPC path (which can't see single rows until
// the 20260721_sane_tx_cap migration is applied in Supabase): a wallet whose
// 24h buy or sell volume exceeds $1B is protocol infrastructure, not a whale.
const MAX_SANE_SIDE_VOLUME_USD = 1_000_000_000

function envReady() {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
         !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function sinceIso(hours = 24) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// Attach entity_name / label / category / is_famous to a set of rows keyed by
// `.address`. Shared by both the RPC and legacy paths.
async function enrichEntities(rows) {
  const whaleAddresses = rows.map(r => r.address?.toLowerCase()).filter(Boolean)
  const nameMap = {}
  if (whaleAddresses.length > 0) {
    const { data: nameData } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name, label, address_type, analysis_tags')
      .in('address', whaleAddresses)
      .not('entity_name', 'is', null)
    for (const row of nameData || []) {
      const tags = row.analysis_tags || {}
      nameMap[row.address] = {
        entity_name: row.entity_name,
        label: row.label,
        category: tags.category || null,
        is_famous: tags.is_famous || false,
      }
    }
  }
  return rows.map(r => {
    const info = nameMap[r.address?.toLowerCase()]
    return {
      ...r,
      entity_name: info?.entity_name || null,
      entity_label: info?.label || null,
      entity_category: info?.category || null,
      is_famous: info?.is_famous || false,
    }
  })
}

export async function getWhaleLeaderboard() {
  if (!envReady()) return []

  // ── Preferred path: exact DB aggregation. ────────────────────────────────
  try {
    const { data, error } = await supabaseAdmin.rpc('whale_leaderboard_agg', {
      p_since: sinceIso(24),
    })
    if (error) throw new Error(error.message)
    if (Array.isArray(data)) {
      const rows = data
        .filter(r =>
          Number(r.buy_volume || 0) <= MAX_SANE_SIDE_VOLUME_USD &&
          Number(r.sell_volume || 0) <= MAX_SANE_SIDE_VOLUME_USD
        )
        .slice(0, 100).map(r => {
        const buys = Number(r.buys || 0)
        const sells = Number(r.sells || 0)
        return {
          address: r.whale_address,
          tradeCount: Number(r.trade_count || 0),
          buyVolume: Math.round(Number(r.buy_volume || 0)),
          sellVolume: Math.round(Number(r.sell_volume || 0)),
          netUsd: Math.round(Number(r.net_usd || 0)),
          totalVolume: Math.round(Number(r.total_volume || 0)),
          buySellRatio: sells === 0 ? buys : +(buys / sells).toFixed(2),
          tokens: Array.isArray(r.tokens) ? r.tokens : [],
          whaleScore: r.whale_score != null ? Number(r.whale_score) : null,
          lastSeen: r.last_seen,
        }
      })
      return await enrichEntities(rows)
    }
  } catch (err) {
    console.warn('[leaderboard] RPC whale_leaderboard_agg failed, using legacy path:', err?.message)
  }

  return await getWhaleLeaderboardLegacy()
}

export async function getTokenLeaderboard() {
  if (!envReady()) return []

  try {
    const { data, error } = await supabaseAdmin.rpc('token_flow_agg', {
      p_since: sinceIso(24),
    })
    if (error) throw new Error(error.message)
    if (Array.isArray(data)) {
      return data.map(r => {
        const buys = Number(r.buys || 0)
        const sells = Number(r.sells || 0)
        return {
          token: r.token_symbol || '—',
          netUsd: Math.round(Number(r.net_usd || 0)),
          buySellRatio: sells === 0 ? buys : +(buys / sells).toFixed(2),
          uniqueWhales: Number(r.unique_whales || 0),
          lastSeen: r.last_seen,
        }
      })
    }
  } catch (err) {
    console.warn('[leaderboard] RPC token_flow_agg failed, using legacy path:', err?.message)
  }

  return await getTokenLeaderboardLegacy()
}

// ─── Legacy JS aggregation (fallback only) ──────────────────────────────────
// Kept verbatim so a deploy that lands before the SQL migration still works.
// Known limitation: capped at 1,000 rows by PostgREST — that's exactly the bug
// the RPC path fixes, so this is a graceful degradation, not a correct result.

async function getWhaleLeaderboardLegacy() {
  const since = sinceIso(24)

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, timestamp, whale_score, counterparty_type')
    .gte('timestamp', since)
    .not('whale_address', 'is', null)
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('classification', ['BUY', 'SELL'])
  if (error) throw new Error(error.message)

  const { data: cexAddresses } = await supabaseAdmin
    .from('addresses')
    .select('address')
    .in('address_type', ['CEX Wallet', 'exchange', 'Exchange Wallet', 'CEX'])
  const cexSet = new Set((cexAddresses || []).map(a => a.address?.toLowerCase()))

  const byWhale = new Map()
  for (const r of data || []) {
    const addr = r.whale_address
    if (!addr || cexSet.has(addr.toLowerCase())) continue
    if (Number(r.usd_value || 0) > MAX_SANE_TX_USD) continue
    const classification = (r.classification || '').toUpperCase()
    let rec = byWhale.get(addr)
    if (!rec) {
      rec = { address: addr, buys: 0, sells: 0, buyVolume: 0, sellVolume: 0, netUsd: 0, totalVolume: 0, tokens: new Set(), whale_score: r.whale_score || null, lastSeen: null, tradeCount: 0 }
    }
    const isBuy = classification === 'BUY'
    const usd = Number(r.usd_value || 0)
    rec.tradeCount += 1
    if (isBuy) { rec.buys += 1; rec.buyVolume += usd; rec.netUsd += usd }
    else { rec.sells += 1; rec.sellVolume += usd; rec.netUsd -= usd }
    rec.totalVolume += usd
    if (r.token_symbol) rec.tokens.add(r.token_symbol)
    rec.whale_score = Math.max(rec.whale_score || 0, Number(r.whale_score || 0))
    if (!rec.lastSeen || new Date(r.timestamp) > new Date(rec.lastSeen)) rec.lastSeen = r.timestamp
    byWhale.set(addr, rec)
  }

  const rows = Array.from(byWhale.values())
    .filter(r => r.tradeCount >= 2)
    .map(r => ({
      address: r.address,
      tradeCount: r.tradeCount,
      buyVolume: Math.round(r.buyVolume),
      sellVolume: Math.round(r.sellVolume),
      netUsd: Math.round(r.netUsd),
      totalVolume: Math.round(r.totalVolume),
      buySellRatio: r.sells === 0 ? r.buys : +(r.buys / r.sells).toFixed(2),
      tokens: Array.from(r.tokens),
      whaleScore: r.whale_score || null,
      lastSeen: r.lastSeen,
    }))
  rows.sort((a, b) => b.totalVolume - a.totalVolume)
  return await enrichEntities(rows.slice(0, 100))
}

async function getTokenLeaderboardLegacy() {
  const since = sinceIso(24)

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, classification, usd_value, timestamp, from_address')
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
  if (error) throw new Error(error.message)

  const byToken = new Map()
  for (const r of data || []) {
    if (Number(r.usd_value || 0) > MAX_SANE_TX_USD) continue
    const token = r.token_symbol || '—'
    let rec = byToken.get(token)
    if (!rec) rec = { token, buys: 0, sells: 0, netUsd: 0, whales: new Set(), lastSeen: null }
    const isBuy = (r.classification || '').toLowerCase() === 'buy'
    const usd = Number(r.usd_value || 0)
    if (isBuy) rec.buys += 1; else rec.sells += 1
    rec.netUsd += isBuy ? usd : -usd
    rec.whales.add(r.from_address || '')
    if (!rec.lastSeen || new Date(r.timestamp) > new Date(rec.lastSeen)) rec.lastSeen = r.timestamp
    byToken.set(token, rec)
  }

  const rows = Array.from(byToken.values()).map(r => ({
    token: r.token,
    netUsd: Math.round(r.netUsd),
    buySellRatio: r.sells === 0 ? r.buys : +(r.buys / r.sells).toFixed(2),
    uniqueWhales: r.whales.size,
    lastSeen: r.lastSeen,
  }))
  rows.sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))
  return rows
}
