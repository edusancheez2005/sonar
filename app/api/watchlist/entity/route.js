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
  return NextResponse.json({ success: true })
}
