import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { trackServer } from '@/lib/analytics/trackServer'
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_follows')
    .select('address, followed_at, nickname')
    .eq('user_id', user.id)
    .order('followed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { address } = body
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  // One wallet, one follow: an existing follow in another spelling (checksummed
  // vs lower-case) is the same follow, and new follows are stored canonically.
  const { data: existing } = await supabaseAdmin
    .from('wallet_follows')
    .select('address, followed_at, nickname')
    .eq('user_id', user.id)
    .in('address', addressVariants(address.trim()))
    .limit(1)
  if (Array.isArray(existing) && existing.length > 0) {
    return NextResponse.json(existing[0], { status: 200 })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_follows')
    .upsert({ user_id: user.id, address: canonicalAddress(address), nickname: body.nickname || null }, { onConflict: 'user_id,address' })
    .select('address, followed_at, nickname')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let fromPath = null
  try {
    const ref = req.headers.get('referer')
    if (ref) fromPath = new URL(ref).pathname
  } catch { /* malformed referer — the follow still succeeded */ }
  await trackServer(supabaseAdmin, {
    userId: user.id,
    event: 'follow',
    props: { source: body.source === 'nudge' ? 'nudge' : 'follow_button', address: address.trim() },
    path: fromPath,
  })

  return NextResponse.json(data, { status: 201 })
}
