/**
 * PHASE 2 - ORCA AI: Rate Limiter
 * Enforces user quotas (2 free, 5 pro)
 */

import { createClient } from '@supabase/supabase-js'

interface QuotaStatus {
  canAsk: boolean
  used: number
  limit: number
  remaining: number
  resetAt?: string
  plan?: string
}

/**
 * Check if user can ask a question (rate limiting)
 */
export async function checkRateLimit(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<QuotaStatus> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get today's date (GMT)
  const today = new Date().toISOString().split('T')[0]
  
  try {
    // Get or create today's quota
    let { data: quota, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    // If no quota exists for today, create one
    if (quotaError || !quota) {
      // Get user's plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single()
      
      const plan = profile?.plan || 'free'
      const limit = plan === 'unlimited' ? 999999 : (plan === 'pro' || plan === 'premium') ? 5 : 2
      
      // Create today's quota
      const { data: newQuota, error: insertError } = await supabase
        .from('user_quotas')
        .insert({
          user_id: userId,
          date: today,
          questions_limit: limit,
          questions_used: 0,
          reset_at: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Error creating quota:', insertError)
        // Fallback: assume free tier
        return {
          canAsk: true,
          used: 0,
          limit: 2,
          remaining: 2,
          plan: 'free'
        }
      }
      
      return {
        canAsk: true,
        used: 0,
        limit: newQuota.questions_limit,
        remaining: newQuota.questions_limit,
        resetAt: newQuota.reset_at,
        plan
      }
    }
    
    // Determine plan from limit
    const determinePlan = (limit: number): string => {
      if (limit >= 999999) return 'unlimited'
      if (limit === 5) return 'premium'
      return 'free'
    }
    
    const userPlan = determinePlan(quota.questions_limit)
    
    // Check if user has exceeded limit
    if (quota.questions_used >= quota.questions_limit) {
      return {
        canAsk: false,
        used: quota.questions_used,
        limit: quota.questions_limit,
        remaining: 0,
        resetAt: quota.reset_at,
        plan: userPlan
      }
    }
    
    // User can ask
    return {
      canAsk: true,
      used: quota.questions_used,
      limit: quota.questions_limit,
      remaining: quota.questions_limit - quota.questions_used,
      resetAt: quota.reset_at,
      plan: userPlan
    }
    
  } catch (error) {
    console.error('Error checking rate limit:', error)
    // Fallback: allow the request but log error
    return {
      canAsk: true,
      used: 0,
      limit: 2,
      remaining: 2
    }
  }
}

/**
 * Increment user's question count
 */
export async function incrementQuota(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const { error } = await supabase
      .from('user_quotas')
      .update({ 
        questions_used: supabase.rpc('increment', { row_id: userId }) 
      })
      .eq('user_id', userId)
      .eq('date', today)
    
    if (error) {
      // Fallback: use raw SQL increment
      const { error: updateError } = await supabase.rpc('increment_quota', {
        p_user_id: userId,
        p_date: today
      })
      
      if (updateError) {
        // Last resort: fetch and update manually
        const { data: quota } = await supabase
          .from('user_quotas')
          .select('questions_used')
          .eq('user_id', userId)
          .eq('date', today)
          .single()
        
        if (quota) {
          await supabase
            .from('user_quotas')
            .update({ questions_used: quota.questions_used + 1 })
            .eq('user_id', userId)
            .eq('date', today)
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('Error incrementing quota:', error)
    return false
  }
}

/**
 * Get user's current quota status
 */
export async function getQuotaStatus(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<QuotaStatus> {
  return checkRateLimit(userId, supabaseUrl, supabaseKey)
}

/**
 * Reset all quotas (admin function, for testing)
 */
export async function resetAllQuotas(
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const { error } = await supabase
      .from('user_quotas')
      .delete()
      .eq('date', today)
    
    return !error
  } catch (error) {
    console.error('Error resetting quotas:', error)
    return false
  }
}

