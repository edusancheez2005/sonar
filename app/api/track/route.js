/**
 * POST /api/track — funnel event sink for the browser.
 * Body: { event, props?, path? } with a Supabase user JWT.
 *
 * Only the two browser-side events are accepted (welcome_choice,
 * paywall_view — see CLIENT_EVENTS); every other funnel event is written
 * server-side where the action happens. Anonymous requests are a no-op so the
 * endpoint cannot be used to flood the table.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isClientEvent } from '@/lib/analytics/events'
import { trackServer } from '@/lib/analytics/trackServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }

async function userIdFromRequest(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null
  try {
    const { data } = await supabaseAdmin.auth.getUser(token)
    return data?.user?.id || null
  } catch {
    return null
  }
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE })
  }
  const event = body?.event
  if (!isClientEvent(event)) {
    return NextResponse.json({ ok: false, error: 'not_a_client_event' }, { status: 400, headers: NO_STORE })
  }
  const userId = await userIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'signed_out' }, { status: 200, headers: NO_STORE })
  }
  const path = typeof body?.path === 'string' ? body.path.split('?')[0].split('#')[0] : null
  const ok = await trackServer(supabaseAdmin, { userId, event, props: body?.props, path })
  return NextResponse.json({ ok }, { status: ok ? 202 : 200, headers: NO_STORE })
}
