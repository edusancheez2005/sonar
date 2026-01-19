import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { checkUserSubscription } from '@/app/lib/checkSubscription'

/**
 * GET /api/whale-alerts
 * Fetch whale alerts from database (Premium feature)
 * 
 * Query params:
 * - limit: number of results (default: 50, max: 100)
 * - blockchain: filter by blockchain
 * - symbol: filter by token symbol
 * - minUsd: minimum USD value
 * - hours: time range in hours (default: 24)
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req) {
  try {
    // Check authentication
    const authHeader = req.headers.get('authorization')
    let userId = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) userId = user.id
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // 🎉 DEMO PHASE: Everyone gets access to whale alerts
    // To re-enable premium check later, uncomment below:
    // const { isActive } = await checkUserSubscription(userId)
    // if (!isActive) {
    //   return NextResponse.json(
    //     { error: 'Premium subscription required', message: 'Whale alerts are a premium feature.' },
    //     { status: 403 }
    //   )
    // }
    
    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const blockchain = searchParams.get('blockchain')
    const symbol = searchParams.get('symbol')
    const minUsd = parseFloat(searchParams.get('minUsd') || '0')
    const hours = parseInt(searchParams.get('hours') || '24')
    
    // Build query
    let query = supabaseAdmin
      .from('whale_alerts')
      .select('*')
      .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    // Apply filters
    if (blockchain) {
      query = query.eq('blockchain', blockchain)
    }
    
    if (symbol) {
      query = query.ilike('symbol', symbol)
    }
    
    if (minUsd > 0) {
      query = query.gte('amount_usd', minUsd)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      filters: {
        blockchain,
        symbol,
        minUsd,
        hours,
        limit
      }
    })
    
  } catch (error) {
    console.error('Error fetching whale alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whale alerts', message: error.message },
      { status: 500 }
    )
  }
}
