/**
 * /api/orca/sessions
 * =============================================================================
 * v4 ORCA sessions surface. The Drawer, Studio, and Mini all read/write the
 * SAME sessions table so a thread started in one surface continues in any
 * other. See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §3.2.
 *
 * GET  /api/orca/sessions[?since=ISO][&limit=20]
 *   -> { sessions: [{ id, title, surface_seed, updated_at, message_count }] }
 *
 * POST /api/orca/sessions
 *   body: { surface_seed?: 'drawer'|'studio'|'mini', title?: string }
 *   -> { id }
 *
 * Auth: bearer Supabase JWT. RLS pins everything to auth.uid().
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TITLE_LEN = 120
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
const VALID_SURFACES = new Set(['drawer', 'studio', 'mini'])

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

export async function GET(request: Request) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

    const url = new URL(request.url)
    const sinceParam = url.searchParams.get('since')
    const limitParam = url.searchParams.get('limit')
    const includeArchived = url.searchParams.get('archived') === 'true'

    let limit = DEFAULT_LIMIT
    if (limitParam) {
      const n = Number(limitParam)
      if (Number.isFinite(n) && n > 0) limit = Math.min(Math.floor(n), MAX_LIMIT)
    }

    let query = supabaseAdmin
      .from('orca_sessions')
      .select('id, title, surface_seed, updated_at, created_at, archived')
      .eq('user_id', a.userId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (!includeArchived) query = query.eq('archived', false)
    if (sinceParam) query = query.lt('updated_at', sinceParam)

    const { data, error } = await query
    if (error) {
      console.error('[api/orca/sessions:GET] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    return NextResponse.json(
      { sessions: data ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/orca/sessions:GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const a = await authenticate(request)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

    let surfaceSeed: string | null = null
    if (typeof b.surface_seed === 'string' && VALID_SURFACES.has(b.surface_seed)) {
      surfaceSeed = b.surface_seed
    }

    let title: string | null = null
    if (typeof b.title === 'string') {
      const trimmed = b.title.trim().slice(0, MAX_TITLE_LEN)
      if (trimmed.length > 0) title = trimmed
    }

    const { data, error } = await supabaseAdmin
      .from('orca_sessions')
      .insert({ user_id: a.userId, title, surface_seed: surfaceSeed })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[api/orca/sessions:POST] db error', error)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('[api/orca/sessions:POST] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
