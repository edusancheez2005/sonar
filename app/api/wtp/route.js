import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { checkRate, getClientIp } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENTS = new Set(['visit', 'intent_click', 'explore_click'])

export async function POST(req) {
  const ip = getClientIp(req)
  if (!checkRate(`wtp:${ip}`, 60000, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ||
      !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = String(body?.event || '')
  if (!EVENTS.has(event)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const clean = (v) => {
    const s = String(v || '').trim().slice(0, 64)
    return s || null
  }

  const { error } = await supabaseAdmin.from('wtp_events').insert([{
    event,
    source: clean(body?.source),
    variant: clean(body?.variant),
    path: clean(body?.path),
    ip,
    user_agent: req.headers.get('user-agent')?.slice(0, 300) || null,
  }])

  if (error) {
    console.error('wtp insert error:', error.message)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
