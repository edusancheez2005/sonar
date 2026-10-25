/**
 * POST /api/personal/alerts/test — "Send me a test" (lib/orca/alerts/testAlert.ts).
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import { sendTestAlert } from '@/lib/orca/alerts/testAlert'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const r = await sendTestAlert(supabaseAdminFresh, user.id)
    if (!r.ok && r.error === 'test_limit') return NextResponse.json({ error: 'test_limit' }, { status: 429 })
    if (!r.ok) throw new Error(r.error)
    return NextResponse.json({ ok: true, id: r.id ?? null })
  } catch (err) {
    console.error('[api/personal/alerts/test POST] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
