import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { checkUserSubscription } from '@/app/lib/checkSubscription'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req) {
  try {
    // Extract session from Authorization header
    const authHeader = req.headers.get('authorization')
    let userId = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ isActive: false, status: null }, { status: 401 })
    }

    const { isActive, status, subscription } = await checkUserSubscription(userId)

    return NextResponse.json({
      isActive,
      status,
      currentPeriodEnd: subscription?.current_period_end || null,
    })
  } catch (err) {
    console.error('Subscription status check error:', err)
    return NextResponse.json({ isActive: false, status: null }, { status: 500 })
  }
}

