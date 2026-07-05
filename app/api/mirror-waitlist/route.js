import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { checkRate, getClientIp } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const ip = getClientIp(req)
  if (!checkRate(`mirror-waitlist:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ||
      !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  }

  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body?.email || user.email || '').trim().toLowerCase()
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const walletAddress = String(body?.wallet_address || '').trim().slice(0, 128)
  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet_address' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('mirror_wallet_waitlist')
    .insert([{ user_id: user.id, email, wallet_address: walletAddress, ip }])

  if (error) {
    if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
      return NextResponse.json({ ok: true, already: true })
    }
    console.error('mirror-waitlist insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
