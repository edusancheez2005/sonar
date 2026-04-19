import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

export async function GET(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('entity_watchlist')
    .select('entity_type, entity_ref, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hydrate curated entities so the client can render rich cards without
  // a second round-trip. Label rows return as-is.
  const curatedRefs = (data || [])
    .filter((r) => r.entity_type === 'curated')
    .map((r) => r.entity_ref)

  let curatedMap = {}
  if (curatedRefs.length > 0) {
    const { data: curated } = await supabaseAdmin
      .from('curated_entities')
      .select('slug, display_name, category, twitter_handle, avatar_url, addresses')
      .in('slug', curatedRefs)
    curatedMap = Object.fromEntries((curated || []).map((c) => [c.slug, c]))
  }

  const hydrated = (data || []).map((r) =>
    r.entity_type === 'curated'
      ? { ...r, curated: curatedMap[r.entity_ref] || null }
      : r
  )

  return NextResponse.json({ follows: hydrated })
}
