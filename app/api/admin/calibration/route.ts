/**
 * ADMIN: Signal Calibration Snapshot management.
 *
 * Backs the /admin/calibration page. Lets operators:
 *   GET    — list every signal_calibration_snapshot row, the recent flips
 *            from calibration_change_log, and the last 10 proposals per
 *            (token, eval_window) so the human can see "calibrator wanted
 *            to flip BTC 24h three runs in a row but hysteresis hasn't
 *            confirmed yet".
 *   POST   — upsert a snapshot row. PK is (token, eval_window).
 *            `approved_by` is forced to the authenticated admin's email
 *            (request body cannot override).
 *   DELETE — remove a snapshot row by (token, eval_window).
 *
 * Replaces the "open SQL editor and INSERT manually" workflow. Reads use
 * supabaseAdminFresh so a write made 5 seconds ago shows up immediately.
 *
 * Added 2026-05-04 (post-Stage 4 limitation #2 fix).
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isAdmin } from '@/app/lib/adminConfig'

export const dynamic = 'force-dynamic'

const VALID_WINDOWS = new Set(['1h', '6h', '24h'])
const VALID_SIGNS = new Set([-1, 0, 1])

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { user: null, error: 'Unauthorized' as const }
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { user: null, error: 'Unauthorized' as const }
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return { user: null, error: 'Unauthorized' as const }
  if (!isAdmin(user.email || '')) return { user, error: 'Forbidden' as const }
  return { user, error: null }
}

export async function GET(req: Request) {
  const { error: authErr } = await requireAdmin(req)
  if (authErr) {
    return NextResponse.json(
      { error: authErr },
      { status: authErr === 'Unauthorized' ? 401 : 403 },
    )
  }

  // Three queries in parallel — small tables, no need for a CTE.
  const [snapRes, changeRes, propRes, calRes] = await Promise.all([
    supabaseAdmin
      .from('signal_calibration_snapshot')
      .select('token, eval_window, sign_multiplier, confidence_score, ic, n_outcomes, approved_by, approved_at, notes')
      .order('token', { ascending: true })
      .order('eval_window', { ascending: true }),
    supabaseAdmin
      .from('calibration_change_log')
      .select('token, eval_window, old_sign, new_sign, ic, hit_rate, n_outcomes, confirmed_runs, decided_at')
      .order('decided_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('calibration_proposal_log')
      .select('token, eval_window, proposed_sign, ic, hit_rate, n_outcomes, proposed_at')
      .order('proposed_at', { ascending: false })
      .limit(300),
    supabaseAdmin
      .from('token_signal_calibration')
      .select('token, eval_window, ic, n_outcomes, sign_multiplier, confidence_score'),
  ])

  if (snapRes.error)   return NextResponse.json({ error: snapRes.error.message }, { status: 500 })
  if (changeRes.error) return NextResponse.json({ error: changeRes.error.message }, { status: 500 })
  if (propRes.error)   return NextResponse.json({ error: propRes.error.message }, { status: 500 })
  // calRes is allowed to fail — if the live calibration table is empty we
  // still want the page to load.

  return NextResponse.json(
    {
      snapshots: snapRes.data || [],
      changes:   changeRes.data || [],
      proposals: propRes.data || [],
      live_calibration: calRes.error ? [] : (calRes.data || []),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: Request) {
  const { user, error: authErr } = await requireAdmin(req)
  if (authErr || !user) {
    return NextResponse.json(
      { error: authErr || 'Unauthorized' },
      { status: authErr === 'Unauthorized' ? 401 : 403 },
    )
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = String(body?.token || '').trim().toUpperCase()
  const evalWindow = String(body?.eval_window || '').trim()
  const signRaw = body?.sign_multiplier
  const signMultiplier =
    signRaw === null || signRaw === undefined ? null : Number(signRaw)
  const confidenceScore = Number(body?.confidence_score)
  const ic = body?.ic === null || body?.ic === undefined ? null : Number(body.ic)
  const nOutcomes = Number(body?.n_outcomes)
  const notes = body?.notes ? String(body.notes).slice(0, 500) : null

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  if (!VALID_WINDOWS.has(evalWindow)) {
    return NextResponse.json({ error: `eval_window must be one of ${[...VALID_WINDOWS].join(',')}` }, { status: 400 })
  }
  if (signMultiplier !== null && !VALID_SIGNS.has(signMultiplier)) {
    return NextResponse.json({ error: 'sign_multiplier must be -1, 0, 1, or null' }, { status: 400 })
  }
  if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 100) {
    return NextResponse.json({ error: 'confidence_score must be 0-100' }, { status: 400 })
  }
  if (!Number.isFinite(nOutcomes) || nOutcomes < 0) {
    return NextResponse.json({ error: 'n_outcomes must be a non-negative integer' }, { status: 400 })
  }

  const row = {
    token,
    eval_window: evalWindow,
    sign_multiplier: signMultiplier,
    confidence_score: confidenceScore,
    ic,
    n_outcomes: Math.floor(nOutcomes),
    // approved_by is server-authoritative — never trust the client.
    approved_by: user.email || user.id,
    approved_at: new Date().toISOString(),
    notes,
  }

  const { error } = await supabaseAdmin
    .from('signal_calibration_snapshot')
    .upsert(row, { onConflict: 'token,eval_window' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row })
}

export async function DELETE(req: Request) {
  const { error: authErr } = await requireAdmin(req)
  if (authErr) {
    return NextResponse.json(
      { error: authErr },
      { status: authErr === 'Unauthorized' ? 401 : 403 },
    )
  }

  const url = new URL(req.url)
  const token = (url.searchParams.get('token') || '').trim().toUpperCase()
  const evalWindow = (url.searchParams.get('eval_window') || '').trim()

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  if (!VALID_WINDOWS.has(evalWindow)) {
    return NextResponse.json({ error: 'invalid eval_window' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('signal_calibration_snapshot')
    .delete()
    .eq('token', token)
    .eq('eval_window', evalWindow)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
