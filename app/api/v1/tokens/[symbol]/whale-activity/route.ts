import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { authenticateApiKey } from '@/app/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { symbol } = await params
  const token = symbol.toUpperCase()

  if (!/^[A-Z0-9]{1,10}$/.test(token)) {
    return NextResponse.json({ error: 'Symbol must be 1-10 alphanumeric characters' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 200)
  const hours = Math.min(Math.max(1, parseInt(searchParams.get('hours') || '24', 10) || 24), 168) // max 7 days
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,whale_address')
    .eq('token_symbol', token)
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    hours,
    count: data?.length || 0,
    data: data || [],
  })
}
