import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { getUserFromRequest } from '@/app/lib/walletAuth'

export const dynamic = 'force-dynamic'

// GET — list current user's wallet identities
export async function GET(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-identities-get:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('wallet_identities')
    .select('id, address, chain, label, is_primary, verified_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

// PATCH — { id, label?, is_primary? }
export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, any> = {}
  if (typeof body.label === 'string') patch.label = body.label.slice(0, 80)
  if (typeof body.is_primary === 'boolean') patch.is_primary = body.is_primary

  if (patch.is_primary === true) {
    await supabaseAdmin
      .from('wallet_identities')
      .update({ is_primary: false })
      .eq('user_id', user.id)
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_identities')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE — ?id=...
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('wallet_identities')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
