import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isAdmin } from '@/app/lib/adminConfig'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected'])

async function requireAdmin(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { user: null, error: 'Unauthorized' }
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { user: null, error: 'Unauthorized' }
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return { user: null, error: 'Unauthorized' }
  if (!isAdmin(user.email)) return { user, error: 'Forbidden' }
  return { user, error: null }
}

// Hydrate a batch of submitter_ids → email. Supabase doesn't let us
// join `auth.users` from PostgREST, so we fan out via the admin API.
async function hydrateSubmitters(rows) {
  const ids = [...new Set(rows.map((r) => r.submitted_by).filter(Boolean))]
  if (ids.length === 0) return rows
  const byId = new Map()
  // `getUserById` is one round-trip per id. With moderation queues
  // typically under ~50 pending rows this is acceptable. If it grows
  // beyond that we can swap in `listUsers` + client-side filter.
  for (const id of ids) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id)
      if (data?.user) byId.set(id, data.user.email || null)
    } catch {
      // swallow — row just won't have submitter_email
    }
  }
  return rows.map((r) => ({
    ...r,
    submitter_email: r.submitted_by ? byId.get(r.submitted_by) || null : null,
  }))
}

export async function GET(req) {
  const { error: authErr } = await requireAdmin(req)
  if (authErr) {
    return NextResponse.json({ error: authErr }, { status: authErr === 'Unauthorized' ? 401 : 403 })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('curated_entities')
    .select(
      'slug, display_name, description, category, avatar_url, twitter_handle, addresses, ' +
        'submission_status, submission_proof, submitted_by, rejection_reason, is_featured, created_at'
    )
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = await hydrateSubmitters(rows || [])
  const byStatus = { pending: [], approved: [], rejected: [] }
  for (const r of all) {
    const s = r.submission_status || 'approved'
    if (byStatus[s]) byStatus[s].push(r)
  }

  const counts = {
    pending: byStatus.pending.length,
    approved: byStatus.approved.length,
    rejected: byStatus.rejected.length,
  }

  return NextResponse.json(
    { counts, pending: byStatus.pending, approved: byStatus.approved, rejected: byStatus.rejected },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function PATCH(req) {
  const { error: authErr } = await requireAdmin(req)
  if (authErr) {
    return NextResponse.json({ error: authErr }, { status: authErr === 'Unauthorized' ? 401 : 403 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = String(body?.slug || '').trim().toLowerCase()
  const status = String(body?.status || '').trim().toLowerCase()
  const reason = body?.rejection_reason ? String(body.rejection_reason).trim() : null

  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `status must be one of ${[...VALID_STATUSES].join(', ')}` },
      { status: 400 }
    )
  }
  if (status === 'rejected' && (!reason || reason.length < 3)) {
    return NextResponse.json(
      { error: 'rejection_reason is required when rejecting (min 3 chars)' },
      { status: 400 }
    )
  }

  const patch = {
    submission_status: status,
    rejection_reason: status === 'rejected' ? reason : null,
  }

  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .update(patch)
    .eq('slug', slug)
    .select('slug, submission_status, rejection_reason, twitter_handle, addresses, avatar_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row: data })
}
