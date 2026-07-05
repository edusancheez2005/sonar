import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
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

    // Billing detail lives in user_subscriptions (written by the Stripe webhook)
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, current_period_end, trial_end, cancel_at_period_end, stripe_subscription_id, trial_used')
      .eq('user_id', userId)
      .maybeSingle()

    return NextResponse.json({
      isActive,
      status,
      subStatus: sub?.status ?? null,
      currentPeriodEnd: sub?.current_period_end ?? subscription?.current_period_end ?? null,
      trialEnd: sub?.trial_end ?? null,
      cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
      trialEligible: !sub?.stripe_subscription_id && !sub?.trial_used,
    })
  } catch (err) {
    console.error('Subscription status check error:', err)
    return NextResponse.json({ isActive: false, status: null }, { status: 500 })
  }
}

