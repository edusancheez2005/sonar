import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']

export async function GET(req) {
  const ip = getClientIp(req)
  const rl = rateLimit(`whales-latest:${ip}`, 120, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: 'page must be a positive integer' }, { status: 400 })
  }
  if (!Number.isFinite(limitRaw) || limitRaw < 1 || limitRaw > 200) {
    return NextResponse.json({ error: 'limit must be between 1 and 200' }, { status: 400 })
  }
  const limit = Math.min(Math.max(1, limitRaw), 200)
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Fetch extra rows to account for filtering out entity-name whale addresses
  const { data: rawData, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,whale_address')
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('classification', ['BUY', 'SELL'])
    .order('timestamp', { ascending: false })
    .range(from, to + 50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out entity names used as whale_address (e.g. "coinbase")
  const data = (rawData || [])
    .filter(t => !t.whale_address || t.whale_address.length >= 20)
    .slice(0, limit)

  return NextResponse.json(
    { data, page, limit },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
} 