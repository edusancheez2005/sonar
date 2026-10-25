import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getSmartMoneyActivity } from '@/lib/whale/smartMoney'

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const tokensParam = searchParams.get('tokens')

  if (!tokensParam) {
    return NextResponse.json({ error: 'Missing tokens param' }, { status: 400 })
  }

  const tokens = tokensParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50)

  if (tokens.length === 0) {
    return NextResponse.json({ error: 'No valid tokens provided' }, { status: 400 })
  }

  try {
    const data = await getSmartMoneyActivity(supabaseAdmin, tokens)
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('trending-whales error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
