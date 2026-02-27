import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('token_symbol, classification, usd_value, timestamp, from_address')
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .gte('timestamp', since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  return NextResponse.json({ data: rows })
} 