/**
 * /api/personal/wallets
 * =============================================================================
 * GET    \u2014 list the authenticated user's tracked wallets (user_wallets).
 * POST   \u2014 add one wallet { address, chain, label? }.
 * DELETE \u2014 remove one wallet by id (\?id=123).
 *
 * Auth: requires a Supabase user JWT in the Authorization header. We verify
 * the JWT via the anon client, then write through the service-role client.
 * RLS still applies in production reads because we also pin every query to
 * the verified user_id from the JWT \u2014 the table never sees a service-role
 * select that crosses user boundaries.
 *
 * Privacy: never reads or writes any column other than (id, user_id,
 * address, chain, label, created_at). All errors are logged server-side
 * only; the response shape is stable so the client never needs to switch
 * on error message text.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CHAINS = new Set([
  'eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp',
])

const MAX_WALLETS_PER_USER = 100
const MAX_LABEL_LEN = 80
const MAX_ADDRESS_LEN = 128

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

function normaliseAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 4 || s.length > MAX_ADDRESS_LEN) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return null
  return s
}

function normaliseChain(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const c = v.trim().toLowerCase()
  return VALID_CHAINS.has(c) ? c : null
}

function normaliseLabel(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  if (s.length > MAX_LABEL_LEN) return s.slice(0, MAX_LABEL_LEN)
  return s
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { data, error } = await (supabaseAdmin as any)
      .from('user_wallets')
      .select('id, address, chain, label, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(MAX_WALLETS_PER_USER)
    if (error) {
      console.error('[api/personal/wallets][GET] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json(
      { items: Array.isArray(data) ? data : [], fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/personal/wallets][GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }
    const address = normaliseAddress(body?.address)
    const chain = normaliseChain(body?.chain)
    const label = normaliseLabel(body?.label)
    if (!address || !chain) {
      return NextResponse.json({ error: 'invalid_args' }, { status: 400 })
    }
    // Enforce per-user cap server-side to keep the table bounded.
    const { count } = await (supabaseAdmin as any)
      .from('user_wallets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
    if (typeof count === 'number' && count >= MAX_WALLETS_PER_USER) {
      return NextResponse.json({ error: 'limit_reached' }, { status: 429 })
    }
    const { data, error } = await (supabaseAdmin as any)
      .from('user_wallets')
      .upsert(
        { user_id: auth.userId, address, chain, label },
        { onConflict: 'user_id,address,chain' }
      )
      .select('id, address, chain, label, created_at')
      .single()
    if (error) {
      console.error('[api/personal/wallets][POST] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('[api/personal/wallets][POST] failure', err)
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
    const idRaw = url.searchParams.get('id')
    const id = idRaw ? Number(idRaw) : NaN
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
    }
    const { error } = await (supabaseAdmin as any)
      .from('user_wallets')
      .delete()
      .eq('user_id', auth.userId)
      .eq('id', id)
    if (error) {
      console.error('[api/personal/wallets][DELETE] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/personal/wallets][DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
