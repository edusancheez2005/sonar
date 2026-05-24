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

/**
 * Tiny inline HTML viewer returned when a browser hits the endpoint directly
 * (Accept: text/html). Avoids dumping raw {"error":"unauthenticated"} JSON to
 * end users who click a link or paste the URL. Keep this string self-contained
 * \u2014 no external CSS, no scripts \u2014 so it works behind every CDN.
 */
const HTML_LANDING = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ORCA memory \u2014 sign in required</title>
<style>
  body{margin:0;background:#0d1421;color:#e0e6ed;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  main{max-width:520px;background:rgba(13,20,33,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:32px}
  h1{margin:0 0 8px;font-size:18px;letter-spacing:.02em}
  p{margin:8px 0;font-size:14px;line-height:1.6;color:#8896a6}
  code{background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px;font-size:12px;color:#00e5ff}
  a{color:#00e5ff;text-decoration:none}
  a:hover{text-decoration:underline}
  .label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7a8c}
</style></head><body><main>
  <div class="label">ORCA memory</div>
  <h1>This endpoint is private.</h1>
  <p>It returns the facts ORCA has remembered about your trading context, scoped to your user account. Visiting it in a browser without a bearer token returns this page.</p>
  <p>To view or delete your memory, open the dashboard at <a href="/dashboard/personal/memory">/dashboard/personal/memory</a> after signing in.</p>
  <p class="label">API</p>
  <p><code>GET /api/orca/memory</code> with <code>Authorization: Bearer &lt;jwt&gt;</code> returns your saved facts.<br/><code>DELETE /api/orca/memory?id=N</code> removes one. <code>DELETE /api/orca/memory</code> with <code>X-Confirm-Delete-All: yes</code> wipes them all.</p>
</main></body></html>`

function wantsHtml(request: Request): boolean {
  const accept = (request.headers.get('accept') || '').toLowerCase()
  // Only return HTML when the client explicitly prefers it AND did not ask for
  // JSON. Browsers send `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`.
  return accept.includes('text/html') && !accept.startsWith('application/json')
}

export async function GET(request: Request) {
  try {
    const a = await authenticate(request)
    if ('error' in a) {
      if (a.status === 401 && wantsHtml(request)) {
        return new Response(HTML_LANDING, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' },
        })
      }
      return NextResponse.json({ error: a.error }, { status: a.status })
    }

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
