/**
 * Watchlist API — Add/remove/list tokens for a user
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  )
}

async function getUserId(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user?.id || null
}

// GET — list user's watchlist
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('symbol, added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ watchlist: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — add token to watchlist
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { symbol } = await request.json()
    if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

    const supabase = getSupabase()
    
    // Check count (limit: 5 free, 25 premium)
    const { count } = await supabase
      .from('user_watchlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro'
    const limit = isPremium ? 25 : 5

    if ((count || 0) >= limit) {
      return NextResponse.json({ 
        error: `Watchlist limit reached (${limit}). ${!isPremium ? 'Upgrade to Premium for 25 slots.' : ''}` 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_watchlists')
      .upsert({ user_id: userId, symbol: symbol.toUpperCase() }, { onConflict: 'user_id,symbol' })

    if (error) throw error
    return NextResponse.json({ success: true, symbol: symbol.toUpperCase() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove token from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { symbol } = await request.json()
    if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol.toUpperCase())

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
