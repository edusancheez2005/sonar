import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    // Fetch whale transactions from past 7 days
    const { data, error } = await supabaseAdmin
      .from('whale_transactions')
      .select('whale_address,classification,usd_value,token_symbol,whale_score,timestamp')
      .gte('timestamp', since)
      .in('counterparty_type', ['CEX', 'DEX'])
      .in('classification', ['BUY', 'SELL'])
      .not('whale_address', 'is', null)
      .order('timestamp', { ascending: false })
    
    if (error) {
      console.error('Supabase error fetching top whales:', error)
      return NextResponse.json({ whales: [] }, { status: 200 })
    }
    
    // Aggregate by whale address
    const whaleMap = new Map()
    
    for (const row of data || []) {
      const addr = row.whale_address
      if (!addr) continue
      
      if (!whaleMap.has(addr)) {
        whaleMap.set(addr, {
          address: addr,
          netUsd: 0,
          buyVolume: 0,
          sellVolume: 0,
          tokens: new Set(),
          whaleScore: row.whale_score || 0,
          lastSeen: row.timestamp,
          txCount: 0
        })
      }
      
      const whale = whaleMap.get(addr)
      const usd = Number(row.usd_value || 0)
      const isBuy = row.classification === 'BUY'
      
      if (isBuy) {
        whale.buyVolume += usd
        whale.netUsd += usd
      } else {
        whale.sellVolume += usd
        whale.netUsd -= usd
      }
      
      if (row.token_symbol) {
        whale.tokens.add(row.token_symbol)
      }
      
      whale.whaleScore = Math.max(whale.whaleScore, row.whale_score || 0)
      whale.txCount += 1
      
      if (new Date(row.timestamp) > new Date(whale.lastSeen)) {
        whale.lastSeen = row.timestamp
      }
    }
    
    // Sort by absolute net flow and take top 10
    const topWhales = Array.from(whaleMap.values())
      .sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))
      .slice(0, 10)

    // Batch-resolve entity names
    const whaleAddresses = topWhales.map(w => w.address.toLowerCase()).filter(Boolean)
    let nameMap = {}
    if (whaleAddresses.length > 0) {
      const { data: nameData } = await supabaseAdmin
        .from('addresses')
        .select('address, entity_name, label, analysis_tags')
        .in('address', whaleAddresses)
        .not('entity_name', 'is', null)
      
      for (const row of nameData || []) {
        const tags = row.analysis_tags || {}
        nameMap[row.address] = {
          entity_name: row.entity_name,
          label: row.label,
          is_famous: tags.is_famous || false,
        }
      }
    }

    const enrichedWhales = topWhales.map(whale => {
        const totalVolume = whale.buyVolume + whale.sellVolume
        const buyPct = totalVolume > 0 ? Math.round((whale.buyVolume / totalVolume) * 100) : 50
        const sellPct = 100 - buyPct
        const info = nameMap[whale.address.toLowerCase()]
        
        return {
          address: whale.address,
          netUsd: whale.netUsd,
          buySellRatio: `${buyPct}/${sellPct}`,
          tokens: Array.from(whale.tokens).slice(0, 5),
          whaleScore: whale.whaleScore,
          lastSeen: whale.lastSeen,
          txCount: whale.txCount,
          entity_name: info?.entity_name || null,
          entity_label: info?.label || null,
          is_famous: info?.is_famous || false,
        }
      })
    
    return NextResponse.json({ whales: enrichedWhales })
  } catch (error) {
    console.error('Error in top-7day API:', error)
    return NextResponse.json({ whales: [] }, { status: 200 })
  }
}

