/**
 * /api/orca/sessions/[id]
 * =============================================================================
 * Per-session reads and mutations. See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §3.2.
 *
 * GET    /api/orca/sessions/{id}      -> { session, messages }
 * PATCH  /api/orca/sessions/{id}      body: { title?, archived? }   -> { ok }
 * DELETE /api/orca/sessions/{id}      -> { deleted: true }
 *
 * Auth: bearer JWT. All access pinned to user_id; RLS also enforces.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TITLE_LEN = 120
const MAX_MESSAGES = 500

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function authenticate(
  request: Request
): Promise<{ userId: string } | { error: string; status: number }> {
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

function badId(id: string | undefined): boolean {
  return !id || !UUID_RE.test(id)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    if (badId(params.id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

    const { data: session, error: sErr } = await supabaseAdmin
      .from('orca_sessions')
      .select('id, title, surface_seed, archived, created_at, updated_at')
      .eq('user_id', a.userId)
      .eq('id', params.id)
      .maybeSingle()
    if (sErr) {
      console.error('[api/orca/sessions/[id]:GET] session db error', sErr)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
    if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const { data: messages, error: mErr } = await supabaseAdmin
      .from('orca_messages')
      .select('id, role, content, tool_calls, sources, follow_ups, focus, confirm, created_at')
      .eq('user_id', a.userId)
      .eq('session_id', params.id)
      .order('id', { ascending: true })
      .limit(MAX_MESSAGES)
    if (mErr) {
      console.error('[api/orca/sessions/[id]:GET] messages db error', mErr)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    return NextResponse.json(
      { session, messages: messages ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/orca/sessions/[id]:GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    if (badId(params.id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

    const patch: Record<string, unknown> = {}
    if (typeof b.title === 'string') {
      const trimmed = b.title.trim().slice(0, MAX_TITLE_LEN)
      patch.title = trimmed.length > 0 ? trimmed : null
    }
    if (typeof b.archived === 'boolean') patch.archived = b.archived
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_changes' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('orca_sessions')
      .update(patch)
      .eq('user_id', a.userId)
      .eq('id', params.id)
    if (error) {
      console.error('[api/orca/sessions/[id]:PATCH] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/orca/sessions/[id]:PATCH] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    if (badId(params.id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('orca_sessions')
      .delete()
      .eq('user_id', a.userId)
      .eq('id', params.id)
    if (error) {
      console.error('[api/orca/sessions/[id]:DELETE] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[api/orca/sessions/[id]:DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
