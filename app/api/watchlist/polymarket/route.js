import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

function normalizeWallet(w) {
  return typeof w === 'string' ? w.trim().toLowerCase() : ''
}

// GET → { follows: [{ proxy_wallet, name, created_at }] } for the current user.
export async function GET(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('polymarket_whale_follows')
    .select('proxy_wallet, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    // Table may not exist yet (migration pending) — treat as empty.
    return NextResponse.json({ follows: [] })
  }
  return NextResponse.json({ follows: data || [] })
}

// POST { proxy_wallet, name? } → follow a whale.
export async function POST(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const proxy_wallet = normalizeWallet(body?.proxy_wallet)
  if (!proxy_wallet) {
    return NextResponse.json({ error: 'proxy_wallet is required' }, { status: 400 })
  }
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null

  const { data, error } = await supabaseAdmin
    .from('polymarket_whale_follows')
    .upsert({ user_id: user.id, proxy_wallet, name }, { onConflict: 'user_id,proxy_wallet' })
    .select('proxy_wallet, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE { proxy_wallet } → unfollow.
export async function DELETE(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const proxy_wallet = normalizeWallet(body?.proxy_wallet)
  if (!proxy_wallet) {
    return NextResponse.json({ error: 'proxy_wallet is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('polymarket_whale_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('proxy_wallet', proxy_wallet)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
