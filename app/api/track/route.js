/**
 * POST /api/track — funnel event sink for the browser.
 * Body: { event, props?, path? }. Optional Bearer JWT attributes the row to a
 * user; without one the row is anonymous (paywall views on public pages).
 * Event names are allowlisted (lib/analytics/events.js); unknown → 400.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isFunnelEvent } from '@/lib/analytics/events'
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
  if (!isFunnelEvent(event)) {
    return NextResponse.json({ ok: false, error: 'unknown_event' }, { status: 400, headers: NO_STORE })
  }
  // Server-only events must not be spoofable from the browser.
  if (event === 'paid' || event === 'checkout' || event === 'signup') {
    return NextResponse.json({ ok: false, error: 'server_only_event' }, { status: 400, headers: NO_STORE })
  }
  const userId = await userIdFromRequest(req)
  const ok = await trackServer(supabaseAdmin, {
    userId,
    event,
    props: body?.props,
    path: typeof body?.path === 'string' ? body.path : null,
  })
  return NextResponse.json({ ok }, { status: ok ? 202 : 200, headers: NO_STORE })
}
