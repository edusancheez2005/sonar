import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
    }

    const now = new Date()
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get total count of all transactions
    const { count: totalCount } = await supabaseAdmin
      .from('whale_transactions')
      .select('*', { count: 'exact', head: true })

    // Get count from last 7 days
    const { count: count7d } = await supabaseAdmin
      .from('whale_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', since7d)

    // Get count from last 24 hours
    const { count: count24h } = await supabaseAdmin
      .from('whale_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', since24h)

    // Get sample of recent data
    const { data: sampleData } = await supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash, timestamp, token_symbol, classification, blockchain, usd_value')
      .order('timestamp', { ascending: false })
      .limit(5)

    // Get sample with filters applied (like dashboard)
    const { data: filteredSample } = await supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash, timestamp, token_symbol, classification, blockchain, usd_value')
      .not('token_symbol', 'is', null)
      .not('token_symbol', 'ilike', 'unknown%')
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false })
      .limit(5)

    return NextResponse.json({
      debug: {
        now: now.toISOString(),
        since24h,
        since7d,
        totalCount,
        count7d,
        count24h,
        sampleData,
        filteredSample,
        hasData: totalCount > 0,
        hasRecent24h: count24h > 0
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
