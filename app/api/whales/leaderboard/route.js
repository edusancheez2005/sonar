import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('from_address, token_symbol, classification, usd_value, timestamp, whale_score')
    .gte('timestamp', since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byWhale = new Map()

  for (const r of data || []) {
    const addr = r.from_address || '—'
    let rec = byWhale.get(addr)
    if (!rec) rec = { address: addr, buys: 0, sells: 0, netUsd: 0, tokens: new Set(), whale_score: r.whale_score || null, lastSeen: null }
    const isBuy = (r.classification || '').toLowerCase() === 'buy'
    const usd = Number(r.usd_value || 0)
    if (isBuy) rec.buys += 1; else rec.sells += 1
    rec.netUsd += isBuy ? usd : -usd
    if (r.token_symbol) rec.tokens.add(r.token_symbol)
    rec.whale_score = Math.max(rec.whale_score || 0, Number(r.whale_score || 0))
    if (!rec.lastSeen || new Date(r.timestamp) > new Date(rec.lastSeen)) rec.lastSeen = r.timestamp
    byWhale.set(addr, rec)
  }

  const rows = Array.from(byWhale.values()).map(r => ({
    address: r.address,
    netUsd: Math.round(r.netUsd),
    buySellRatio: r.sells === 0 ? r.buys : +(r.buys / r.sells).toFixed(2),
    tokens: Array.from(r.tokens),
    whaleScore: r.whale_score || null,
    lastSeen: r.lastSeen,
  }))

  rows.sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))

  return NextResponse.json({ data: rows })
} 