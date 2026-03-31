import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { authenticateApiKey } from '@/app/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD']

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 200)
  const chain = searchParams.get('chain') || null
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('all_whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,whale_address')
    .not('token_symbol', 'in', `(${STABLECOINS.join(',')})`)
    .in('classification', ['BUY', 'SELL'])
    .order('timestamp', { ascending: false })
    .range(from, to)

  if (chain) {
    query = query.eq('blockchain', chain)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], page, limit, chain })
}
