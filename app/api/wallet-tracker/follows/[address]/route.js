import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { addressVariants } from '@/lib/wallet/addressVariants'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'

const PICKER_NAMES = new Set(FAMOUS_WALLETS.map((w) => w.name))

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

export async function DELETE(req, { params }) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { address } = await params

  // Any stored spelling (lower-case from the welcome picker, checksummed from
  // a wallet page URL) is the same follow.
  const variants = addressVariants(decodeURIComponent(String(address || '')))
  const { data: removed, error } = await supabaseAdmin
    .from('wallet_follows')
    .delete()
    .eq('user_id', user.id)
    .in('address', variants)
    .select('nickname')

  // The welcome picker created an alert with this follow (nickname = the
  // figure's name). Unfollowing the wallet stops it, unless the user also set
  // their own alert on the wallet page.
  if (!error && (removed || []).some((r) => PICKER_NAMES.has(r.nickname))) {
    try {
      const { data: ownAlerts } = await supabaseAdmin
        .from('wallet_alerts')
        .select('id')
        .eq('user_id', user.id)
        .in('address', variants)
        .eq('is_active', true)
        .limit(1)
      if (!ownAlerts || ownAlerts.length === 0) {
        await supabaseAdmin
          .from('user_alerts')
          .delete()
          .eq('user_id', user.id)
          .eq('kind', 'wallet_activity')
          .in('address', variants)
      }
    } catch { /* the unfollow itself succeeded */ }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req, { params }) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { address } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_follows')
    .update({ nickname: body.nickname || null })
    .eq('user_id', user.id)
    .eq('address', address)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
