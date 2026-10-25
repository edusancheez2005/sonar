/**
 * Watchlist API — Add/remove/list tokens for a user
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'

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

    // Only coins we actually price: a symbol is accepted when its canonical
    // form (WBTC → BTC) has a price snapshot in the last 24 h. Junk such as
    // MEMECOINS or VITALIK used to land on watchlists and show empty rows.
    const sym = String(symbol).trim().toUpperCase()
    if (!/^[A-Z0-9._-]{1,12}$/.test(sym)) return NextResponse.json({ error: 'unknown_symbol' }, { status: 400 })
    {
      const canon = canonicalSymbol(sym) || sym
      const { data: priced } = await supabaseAdminFresh
        .from('price_snapshots')
        .select('ticker')
        .in('ticker', Array.from(new Set([sym, canon])))
        .gte('timestamp', new Date(Date.now() - 24 * 3_600_000).toISOString())
        .limit(1)
      if (!priced || priced.length === 0) return NextResponse.json({ error: 'unknown_symbol' }, { status: 400 })
    }

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

    const isPremium = true // All features now free
    const limit = 25

    if ((count || 0) >= limit) {
      return NextResponse.json({ 
        error: `Watchlist limit reached (${limit}). ${!isPremium ? 'Upgrade to Premium for 25 slots.' : ''}` 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_watchlists')
      .upsert({ user_id: userId, symbol: sym }, { onConflict: 'user_id,symbol' })

    if (error) throw error
    return NextResponse.json({ success: true, symbol: sym })
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
