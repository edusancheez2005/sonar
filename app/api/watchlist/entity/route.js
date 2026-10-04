import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { trackServer } from '@/lib/analytics/trackServer'
import { addressVariants } from '@/lib/wallet/addressVariants'

export const dynamic = 'force-dynamic'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

function validBody(body) {
  if (!body || typeof body !== 'object') return 'Invalid JSON body'
  const { entity_type, entity_ref } = body
  if (!entity_type || !['label', 'curated'].includes(entity_type)) {
    return "entity_type must be 'label' or 'curated'"
  }
  if (!entity_ref || typeof entity_ref !== 'string' || entity_ref.trim() === '') {
    return 'entity_ref is required'
  }
  return null
}

export async function POST(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const validationError = validBody(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { entity_type, entity_ref } = body
  const { data, error } = await supabaseAdmin
    .from('entity_watchlist')
    .upsert(
      { user_id: user.id, entity_type, entity_ref: entity_ref.trim() },
      { onConflict: 'user_id,entity_type,entity_ref' }
    )
    .select('entity_type, entity_ref, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await trackServer(supabaseAdmin, {
    userId: user.id,
    event: 'follow',
    props: { source: 'figures', entity_type, slug: entity_ref.trim().slice(0, 80) },
    path: '/figures',
  })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const validationError = validBody(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { entity_type, entity_ref } = body
  const { error } = await supabaseAdmin
    .from('entity_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('entity_type', entity_type)
    .eq('entity_ref', entity_ref.trim())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Unfollowing a figure also removes what the welcome picker created for it:
  // its wallet follows (tagged with the figure's name as nickname) and the
  // wallet alerts on those addresses — otherwise the alerts kept coming.
  if (entity_type === 'curated') {
    try {
      const { data: ent } = await supabaseAdmin
        .from('curated_entities')
        .select('display_name')
        .eq('slug', entity_ref.trim())
        .maybeSingle()
      if (ent?.display_name) {
        const { data: removed } = await supabaseAdmin
          .from('wallet_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('nickname', ent.display_name)
          .select('address')
        const addrs = (removed || []).map((r) => r.address).filter(Boolean)
        if (addrs.length > 0) {
          await supabaseAdmin
            .from('user_alerts')
            .delete()
            .eq('user_id', user.id)
            .eq('kind', 'wallet_activity')
            .in('address', Array.from(new Set(addrs.flatMap((a) => addressVariants(a)))))
        }
      }
    } catch { /* the figure unfollow itself succeeded */ }
  }
  return NextResponse.json({ success: true })
}
