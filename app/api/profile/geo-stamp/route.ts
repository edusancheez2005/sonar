/**
 * POST /api/profile/geo-stamp
 * =============================================================================
 * Fills profiles.country for the signed-in user from Vercel's edge geo header
 * (x-vercel-ip-country) — fire-and-forget from the app shell once per browser
 * session (components/GeoStamp.jsx).
 *
 * Why: 911/925 profiles had no country (2026-09-22 audit) because nothing
 * captured it historically. Signup paths now stamp it, and this route
 * backfills EXISTING users on their next visit. Only ever fills NULL —
 * a user-provided answer or an earlier stamp is never overwritten, so the
 * value stays "country when we first learned it", not a moving target.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') || ''
    const jwt = auth.replace(/^Bearer\s+/i, '')
    if (!jwt) return NextResponse.json({ ok: false }, { status: 401 })

    const { data, error } = await supabaseAdmin.auth.getUser(jwt)
    const userId = data?.user?.id
    if (error || !userId) return NextResponse.json({ ok: false }, { status: 401 })

    const country = request.headers.get('x-vercel-ip-country')
    if (!country || country === 'XX') {
      return NextResponse.json({ ok: true, stamped: false })
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from('profiles')
      .update({ country, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .is('country', null)
      .select('id')

    if (upErr) {
      console.warn('[geo-stamp] update failed', upErr.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true, stamped: (updated?.length ?? 0) > 0 })
  } catch (err: any) {
    console.warn('[geo-stamp] error', err?.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
