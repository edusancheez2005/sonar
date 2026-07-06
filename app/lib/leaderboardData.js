import 'server-only'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

// Shared leaderboard aggregations. Called BOTH by the API routes (for the
// dashboard/client fetches) and directly by the server-rendered pages
// (/whales/leaderboard, /tokens). Rendering pages query this inline rather
// than importing the route handler — importing a route module (with its
// segment config) into a page bailed the whole page to client-side render
// and served empty HTML. A direct data function does not.

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

function envReady() {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
         !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function getWhaleLeaderboard() {
  if (!envReady()) return []
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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
  const topRows = rows.slice(0, 100)

  const whaleAddresses = topRows.map(r => r.address.toLowerCase()).filter(Boolean)
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

  return topRows.map(r => {
    const info = nameMap[r.address.toLowerCase()]
    return {
      ...r,
      entity_name: info?.entity_name || null,
      entity_label: info?.label || null,
      entity_category: info?.category || null,
      is_famous: info?.is_famous || false,
    }
  })
}

export async function getTokenLeaderboard() {
  if (!envReady()) return []
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, classification, usd_value, timestamp, from_address')
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
  if (error) throw new Error(error.message)

  const byToken = new Map()
  for (const r of data || []) {
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
