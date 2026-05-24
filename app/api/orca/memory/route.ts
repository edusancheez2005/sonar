/**
 * /api/orca/memory
 * =============================================================================
 * GDPR right-to-access + right-to-erasure surface for the user's stored
 * orca_memory facts (§4.G of ORCA_COPILOT_BUILD_PROMPT.md).
 *
 * GET    /api/orca/memory          → list the caller's facts (top 50, recent first)
 * DELETE /api/orca/memory          → delete ALL of the caller's facts
 * DELETE /api/orca/memory?id=123   → delete one fact (must belong to caller)
 *
 * Auth: Supabase user JWT in the Authorization header (Bearer ...).
 * We deliberately never expose another user's facts: the supabaseAdmin
 * query is always scoped `eq('user_id', userId)` AFTER verifying the
 * token, and RLS would block it anyway.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authenticate(request: Request): Promise<{ userId: string } | { error: string; status: number }> {
  const auth = request.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!token) return { error: 'unauthenticated', status: 401 }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !anonKey) return { error: 'misconfigured', status: 500 }
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user?.id) return { error: 'unauthenticated', status: 401 }
  return { userId: data.user.id }
}

export async function GET(request: Request) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

    const nowIso = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('orca_memory')
      .select('id, fact, confidence, created_at, expires_at, source_message_id')
      .eq('user_id', a.userId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.error('[api/orca/memory:GET] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json(
      { facts: data ?? [], fetched_at: nowIso },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/orca/memory:GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

    const url = new URL(request.url)
    const idParam = url.searchParams.get('id')

    if (idParam) {
      const id = Number(idParam)
      if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
        return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
      }
      const { error } = await supabaseAdmin
        .from('orca_memory')
        .delete()
        .eq('user_id', a.userId)
        .eq('id', id)
      if (error) {
        console.error('[api/orca/memory:DELETE one] db error', error)
        return NextResponse.json({ error: 'internal_error' }, { status: 500 })
      }
      return NextResponse.json({ deleted: 'one', id })
    }

    // Delete-all path: require an explicit confirmation header so a stray
    // DELETE without a query param can't accidentally wipe the user's memory.
    const confirm = request.headers.get('x-confirm-delete-all')
    if (confirm !== 'yes') {
      return NextResponse.json(
        { error: 'confirmation_required', hint: 'set header x-confirm-delete-all: yes' },
        { status: 400 }
      )
    }
    const { error } = await supabaseAdmin
      .from('orca_memory')
      .delete()
      .eq('user_id', a.userId)
    if (error) {
      console.error('[api/orca/memory:DELETE all] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    return NextResponse.json({ deleted: 'all' })
  } catch (err) {
    console.error('[api/orca/memory:DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
