import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  // NEW: Use whale_address column (with fallback to from_address for backward compatibility)
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('whale_address, from_address, token_symbol, classification, usd_value, timestamp, whale_score, counterparty_type')
    .gte('timestamp', since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get CEX addresses to exclude
  const { data: cexAddresses } = await supabaseAdmin
    .from('addresses')
    .select('address')
    .in('address_type', ['CEX Wallet', 'exchange', 'Exchange Wallet'])
  
  const cexSet = new Set((cexAddresses || []).map(a => a.address?.toLowerCase()))

  const byWhale = new Map()

  for (const r of data || []) {
    // Use whale_address if available, fallback to from_address
    const addr = r.whale_address || r.from_address
    if (!addr || cexSet.has(addr.toLowerCase())) continue // Skip CEX addresses
    
    // Skip if not a real trade (if counterparty_type is available)
    if (r.counterparty_type && !['CEX', 'DEX'].includes(r.counterparty_type)) continue
    
    // Skip if not BUY/SELL
    const classification = (r.classification || '').toUpperCase()
    if (!['BUY', 'SELL'].includes(classification)) continue
    
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

  return NextResponse.json({ data: rows.slice(0, 100) })
} 