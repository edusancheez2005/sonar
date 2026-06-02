/**
 * /api/personal/mute
 * =============================================================================
 * GET    — list the authenticated user's currently muted tickers + expiry.
 * DELETE — unmute one ticker (?ticker=SOL).
 *
 * Backs the "Muted tickers" section on the Alerts tab. Voice-write muting
 * happens through the chat confirm-trip (muteTicker / unmuteTicker); this REST
 * surface is the manual UI equivalent for unmuting + display.
 *
 * Auth: requires a Supabase user JWT in the Authorization header. We verify
 * the JWT via the anon client, then read/write through the service-role client
 * pinned to the verified user_id. Storage is user_profile.muted_tickers (text[])
 * + muted_tickers_until (timestamptz) — see 20260604_user_profile_mute_tickers.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(request: Request): string | null {
  const auth = request.headers.get('authorization') || ''
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null
}

async function authenticate(request: Request): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const token = bearer(request)
  if (!token) return { ok: false, status: 401, error: 'unauthenticated' }
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!anonUrl || !anonKey) {
    return { ok: false, status: 500, error: 'misconfigured' }
  }
  const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user?.id) {
    return { ok: false, status: 401, error: 'unauthenticated' }
  }
  return { ok: true, userId: data.user.id }
}

function normaliseTicker(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/[.,!?;:]+$/g, '').toUpperCase()
  if (!t || t.length > 12) return null
  if (!/^[A-Z0-9._-]+$/.test(t)) return null
  return t
}

/** Active mutes only: expiry must be in the future. */
function activeMutes(row: any): { tickers: string[]; until_iso: string | null } {
  const arr = Array.isArray(row?.muted_tickers) ? row.muted_tickers : []
  const until = row?.muted_tickers_until || null
  if (!arr.length || !until) return { tickers: [], until_iso: null }
  const untilMs = new Date(until).getTime()
  if (isNaN(untilMs) || untilMs <= Date.now()) return { tickers: [], until_iso: null }
  const tickers = Array.from(
    new Set(arr.map((t: unknown) => (typeof t === 'string' ? t.trim().toUpperCase() : '')).filter(Boolean))
  ) as string[]
  return { tickers, until_iso: new Date(until).toISOString() }
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { data, error } = await (supabaseAdmin as any)
      .from('user_profile')
      .select('muted_tickers, muted_tickers_until')
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (error) {
      console.error('[api/personal/mute][GET] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    const { tickers, until_iso } = activeMutes(data)
    return NextResponse.json(
      { tickers, until_iso, fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/personal/mute][GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const url = new URL(request.url)
    const ticker = normaliseTicker(url.searchParams.get('ticker'))
    if (!ticker) {
      return NextResponse.json({ error: 'invalid_ticker' }, { status: 400 })
    }
    const { data: row, error: loadErr } = await (supabaseAdmin as any)
      .from('user_profile')
      .select('muted_tickers, muted_tickers_until')
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (loadErr) {
      console.error('[api/personal/mute][DELETE] load error', loadErr)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    const current: string[] = Array.isArray(row?.muted_tickers) ? row.muted_tickers : []
    const set = new Set(current.map((t) => String(t).toUpperCase()))
    if (!set.has(ticker)) {
      return NextResponse.json({ ok: true, removed: false, reason: 'not_muted' })
    }
    set.delete(ticker)
    const next = Array.from(set)
    const patch: Record<string, unknown> = { user_id: auth.userId, muted_tickers: next }
    if (next.length === 0) patch.muted_tickers_until = null
    const { error: upErr } = await (supabaseAdmin as any)
      .from('user_profile')
      .upsert(patch, { onConflict: 'user_id' })
    if (upErr) {
      console.error('[api/personal/mute][DELETE] write error', upErr)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, removed: true, ticker })
  } catch (err) {
    console.error('[api/personal/mute][DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
