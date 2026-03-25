import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  // Filter to last 3 hours to avoid full table scan timeout on large tables
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('timestamp')
    .gte('timestamp', threeHoursAgo)
    .order('timestamp', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[health/algorithm] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const lastTs = data && data[0]?.timestamp ? new Date(data[0].timestamp).getTime() : 0
  const now = Date.now()
  const active = lastTs > 0 && (now - lastTs) <= 120 * 60 * 1000 // Active if transaction within last 2 hours

  return NextResponse.json({ active, lastTs: lastTs || null })
} 