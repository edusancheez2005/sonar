/**
 * Chat Quota API
 * GET: Returns the user's current quota status (server-side source of truth)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/orca/rate-limiter'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quota = await checkRateLimit(user.id, supabaseUrl, supabaseKey)

    return NextResponse.json({
      canAsk: quota.canAsk,
      remaining: quota.remaining,
      used: quota.used,
      limit: quota.limit,
      plan: quota.plan || 'free',
      resetsAt: quota.resetAt || new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()
    })
  } catch (error) {
    console.error('Error in quota endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
