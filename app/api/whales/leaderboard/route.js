import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

  // NEW: Use whale_address column and exclude CEX addresses
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, timestamp, whale_score, counterparty_type')
    .gte('timestamp', since)
    .not('whale_address', 'is', null)
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('counterparty_type', ['CEX', 'DEX'])
    .in('classification', ['BUY', 'SELL'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get CEX addresses to exclude + all named addresses for display
  const { data: cexAddresses } = await supabaseAdmin
    .from('addresses')
    .select('address')
    .in('address_type', ['CEX Wallet', 'exchange', 'Exchange Wallet', 'CEX'])
  
  const cexSet = new Set((cexAddresses || []).map(a => a.address?.toLowerCase()))

  const byWhale = new Map()

  for (const r of data || []) {
    const addr = r.whale_address
    if (!addr || cexSet.has(addr.toLowerCase())) continue // Skip CEX addresses
    
    const classification = r.classification.toUpperCase()
    
    let rec = byWhale.get(addr)
    if (!rec) {
      rec = { 
        address: addr, 
        buys: 0, 
        sells: 0, 
        buyVolume: 0,
        sellVolume: 0,
        netUsd: 0, 
        totalVolume: 0,
        tokens: new Set(), 
        whale_score: r.whale_score || null, 
        lastSeen: null,
        tradeCount: 0
      }
    }
    
    const isBuy = classification === 'BUY'
    const usd = Number(r.usd_value || 0)
    
    rec.tradeCount += 1
    if (isBuy) {
      rec.buys += 1
      rec.buyVolume += usd
      rec.netUsd += usd
    } else {
      rec.sells += 1
      rec.sellVolume += usd
      rec.netUsd -= usd
    }
    rec.totalVolume += usd
    
    if (r.token_symbol) rec.tokens.add(r.token_symbol)
    rec.whale_score = Math.max(rec.whale_score || 0, Number(r.whale_score || 0))
    if (!rec.lastSeen || new Date(r.timestamp) > new Date(rec.lastSeen)) {
      rec.lastSeen = r.timestamp
    }
    byWhale.set(addr, rec)
  }

  // Filter: Must have at least 2 trades
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

  // Sort by total volume DESC
  rows.sort((a, b) => b.totalVolume - a.totalVolume)
  const topRows = rows.slice(0, 100)

  // Batch-resolve entity names for top whales
  const whaleAddresses = topRows.map(r => r.address.toLowerCase()).filter(Boolean)
  let nameMap = {}
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

  // Attach entity names to results
  const enrichedRows = topRows.map(r => {
    const info = nameMap[r.address.toLowerCase()]
    return {
      ...r,
      entity_name: info?.entity_name || null,
      entity_label: info?.label || null,
      entity_category: info?.category || null,
      is_famous: info?.is_famous || false,
    }
  })

  return NextResponse.json({ data: enrichedRows })
} 