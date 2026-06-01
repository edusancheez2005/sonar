/**
 * /api/personal/alerts/[id]
 * =============================================================================
 * PATCH  — toggle a rule on/off or change its threshold.
 * DELETE — remove a rule.
 *
 * Every mutation is scoped to the verified user id, so a user can only touch
 * their own rules even though the service-role client performs the write.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const id = params?.id
    if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof (body as any).enabled === 'boolean') patch.enabled = (body as any).enabled
    if ((body as any).threshold_pct !== undefined) {
      const pct = Number((body as any).threshold_pct)
      if (!Number.isFinite(pct) || pct <= 0) {
        return NextResponse.json({ error: 'invalid_threshold' }, { status: 400 })
      }
      patch.threshold_pct = pct
      patch.threshold_usd = null
    }
    if ((body as any).threshold_usd !== undefined) {
      const usd = Number((body as any).threshold_usd)
      if (!Number.isFinite(usd) || usd <= 0) {
        return NextResponse.json({ error: 'invalid_threshold' }, { status: 400 })
      }
      patch.threshold_usd = Math.round(usd)
      patch.threshold_pct = null
    }

    const { data, error } = await supabaseAdminFresh
      .from('user_alerts')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, ticker, kind, threshold_pct, threshold_usd, enabled, created_at, updated_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    return NextResponse.json({ rule: data })
  } catch (err) {
    console.error('[api/personal/alerts/[id] PATCH] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const id = params?.id
    if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

    const { error } = await supabaseAdminFresh
      .from('user_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/personal/alerts/[id] DELETE] failure', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
