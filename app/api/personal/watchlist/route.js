/**
 * GET /api/personal/watchlist
 * =============================================================================
 * Returns the authenticated user's combined holdings + watchlist tickers,
 * hydrated with price + whale net flow + latest headline.
 *
 * Auth: requires a Supabase user JWT in the Authorization header
 *       (`Bearer <access_token>`). Service-role reads of per-user data
 *       without verifying the JWT are forbidden by §3.5.4 of
 *       ORCA_COPILOT_BUILD_PROMPT.md.
 *
 * Response shape:
 *   { items: WatchlistItem[], fetched_at: string }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getUserTickers, hydrateTickers } from '@/lib/personal/watchlist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const auth = request.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : null
    if (!token) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // Verify the JWT against Supabase auth using the anon client (no service
    // role exposed). On success we get back the user id; on failure we 401.
    const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!anonUrl || !anonKey) {
      return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
    }
    const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const userId = userData.user.id

    const tickers = await getUserTickers(userId, supabaseAdmin)
    const items = await hydrateTickers(tickers, supabaseAdmin)

    return NextResponse.json(
      { items, fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    // Never leak the error message — log server-side only.
    console.error('[api/personal/watchlist] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
