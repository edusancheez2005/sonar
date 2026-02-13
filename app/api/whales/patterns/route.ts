/**
 * Whale Patterns API — Find recurring whale addresses for a token
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()
    const days = Math.min(Number(searchParams.get('days') || 30), 90)

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get all transactions for this token in the period
    const { data: txns, error } = await supabase
      .from('whale_transactions')
      .select('whale_address, from_address, classification, usd_value, timestamp')
      .eq('token_symbol', symbol)
      .gte('timestamp', sinceDate)
      .order('timestamp', { ascending: false })
      .limit(500)

    if (error) throw error

    // Group by whale address
    const whaleMap = new Map<string, {
      address: string
      txCount: number
      buyCount: number
      sellCount: number
      totalVolume: number
      netFlow: number
      firstSeen: string
      lastSeen: string
    }>()

    for (const tx of (txns || [])) {
      const addr = tx.whale_address || tx.from_address || ''
      if (!addr) continue

      const existing = whaleMap.get(addr) || {
        address: addr,
        txCount: 0,
        buyCount: 0,
        sellCount: 0,
        totalVolume: 0,
        netFlow: 0,
        firstSeen: tx.timestamp,
        lastSeen: tx.timestamp,
      }

      const usd = Number(tx.usd_value || 0)
      const side = (tx.classification || '').toLowerCase()

      existing.txCount += 1
      existing.totalVolume += usd
      if (side === 'buy') {
        existing.buyCount += 1
        existing.netFlow += usd
      } else if (side === 'sell') {
        existing.sellCount += 1
        existing.netFlow -= usd
      }
      if (tx.timestamp < existing.firstSeen) existing.firstSeen = tx.timestamp
      if (tx.timestamp > existing.lastSeen) existing.lastSeen = tx.timestamp

      whaleMap.set(addr, existing)
    }

    // Filter to recurring whales (2+ transactions) and sort by count
    const patterns = Array.from(whaleMap.values())
      .filter(w => w.txCount >= 2)
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 10)
      .map(w => ({
        ...w,
        pattern: w.buyCount > 0 && w.sellCount === 0 ? 'STRONG ACCUMULATOR' :
                 w.sellCount > 0 && w.buyCount === 0 ? 'STRONG DISTRIBUTOR' :
                 w.netFlow > 0 ? 'NET ACCUMULATOR' : 
                 w.netFlow < 0 ? 'NET DISTRIBUTOR' : 'MIXED',
        totalVolume: Math.round(w.totalVolume),
        netFlow: Math.round(w.netFlow),
      }))

    return NextResponse.json({
      symbol,
      days,
      patterns,
      total: patterns.length,
    })
  } catch (err: any) {
    console.error('Whale patterns error:', err)
    return NextResponse.json({ error: err.message, patterns: [] }, { status: 500 })
  }
}
