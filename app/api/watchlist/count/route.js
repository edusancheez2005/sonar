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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [walletCount, entityCount] = await Promise.all([
    supabaseAdmin
      .from('wallet_follows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('entity_watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const total = (walletCount.count || 0) + (entityCount.count || 0)
  return NextResponse.json(
    { total },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
