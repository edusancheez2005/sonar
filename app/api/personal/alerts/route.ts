/**
 * /api/personal/alerts
 * =============================================================================
 * GET  — list the authenticated user's alert rules.
 * POST — create (or re-enable) a rule. Enforces MAX_ACTIVE_RULES_PER_USER.
 *
 * Auth: Supabase user JWT (Authorization: Bearer <token>). All per-user reads
 * and writes use the verified user id (§3.5.4 — no service-role reads of
 * per-user data without a verified JWT).
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import {
  MAX_ACTIVE_RULES_PER_USER,
  DEFAULT_PRICE_MOVE_PCT,
  DEFAULT_WHALE_FLOW_USD,
} from '@/lib/orca/alerts/types'
import { normaliseTicker, isAlertKind, resolveThreshold } from '@/lib/orca/alerts/validate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { data, error } = await supabaseAdminFresh
      .from('user_alerts')
      .select('id, ticker, kind, threshold_pct, threshold_usd, enabled, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_ACTIVE_RULES_PER_USER + 10)
    if (error) throw error

    return NextResponse.json(
      { rules: data ?? [], fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api/personal/alerts GET] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const ticker = normaliseTicker((body as any).ticker)
    if (!ticker) return NextResponse.json({ error: 'invalid_ticker' }, { status: 400 })

    const kind = (body as any).kind
    if (!isAlertKind(kind)) return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })

    // Fill sensible defaults before validating threshold shape.
    const threshold = resolveThreshold(kind, {
      threshold_pct: (body as any).threshold_pct ?? (kind === 'price_move' ? DEFAULT_PRICE_MOVE_PCT : undefined),
      threshold_usd: (body as any).threshold_usd ?? (kind === 'whale_flow' ? DEFAULT_WHALE_FLOW_USD : undefined),
    })
    if (!threshold) return NextResponse.json({ error: 'invalid_threshold' }, { status: 400 })

    // Enforce the active-rule cap (only counts enabled rows; a re-enable of an
    // existing (ticker,kind) does not add to the count thanks to the unique key).
    const { data: existing, error: countErr } = await supabaseAdminFresh
      .from('user_alerts')
      .select('id, ticker, kind, enabled')
      .eq('user_id', user.id)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    if (countErr) throw countErr
    const rows = existing ?? []
    const alreadyExists = rows.some((r: any) => r.ticker === ticker && r.kind === kind)
    const activeCount = rows.filter((r: any) => r.enabled).length
    if (!alreadyExists && activeCount >= MAX_ACTIVE_RULES_PER_USER) {
      return NextResponse.json(
        { error: 'rule_limit_reached', limit: MAX_ACTIVE_RULES_PER_USER },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseAdminFresh
      .from('user_alerts')
      .upsert(
        {
          user_id: user.id,
          ticker,
          kind,
          threshold_pct: threshold.threshold_pct,
          threshold_usd: threshold.threshold_usd,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,ticker,kind' }
      )
      .select('id, ticker, kind, threshold_pct, threshold_usd, enabled, created_at, updated_at')
      .single()
    if (error) throw error

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (err) {
    console.error('[api/personal/alerts POST] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
