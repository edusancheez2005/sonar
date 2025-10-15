import { supabaseAdmin } from './supabaseAdmin'

/**
 * Check if a user has an active subscription
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{isActive: boolean, status: string|null, subscription: object|null}>}
 */
export async function checkUserSubscription(userId) {
  if (!userId) {
    return { isActive: false, status: null, subscription: null }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return { isActive: false, status: null, subscription: null }
    }

    const isActive = data.subscription_status === 'active' || data.subscription_status === 'trialing'

    return {
      isActive,
      status: data.subscription_status,
      subscription: data,
    }
  } catch (err) {
    console.error('Error checking subscription:', err)
    return { isActive: false, status: null, subscription: null }
  }
}

/**
 * Check if a user has an active subscription (client-side via API)
 * @returns {Promise<{isActive: boolean, status: string|null}>}
 */
export async function checkSubscriptionClient() {
  try {
    const res = await fetch('/api/subscription/status')
    if (!res.ok) return { isActive: false, status: null }
    const data = await res.json()
    return { isActive: data.isActive || false, status: data.status || null }
  } catch {
    return { isActive: false, status: null }
  }
}

