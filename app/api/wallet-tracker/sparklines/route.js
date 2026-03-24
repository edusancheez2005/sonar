import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const addressesRaw = searchParams.get('addresses') || ''
  const addresses = addressesRaw.split(',').map(a => a.trim()).filter(Boolean)

  if (addresses.length === 0) {
    return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
  }

  // Cap at 100 addresses per request
  const capped = addresses.slice(0, 100)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, timestamp, usd_value')
    .in('whale_address', capped)
    .gte('timestamp', sevenDaysAgo)
    .order('timestamp', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build day-indexed volume per address
  const result = {}
  for (const addr of capped) {
    result[addr] = [0, 0, 0, 0, 0, 0, 0]
  }

  const now = Date.now()
  for (const row of data || []) {
    const addr = row.whale_address
    if (!result[addr]) continue
    const txTime = new Date(row.timestamp).getTime()
    const daysAgo = Math.floor((now - txTime) / (24 * 60 * 60 * 1000))
    const dayIndex = 6 - Math.min(daysAgo, 6)
    result[addr][dayIndex] += Math.abs(Number(row.usd_value) || 0)
  }

  return NextResponse.json(
    result,
    { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
  )
}
