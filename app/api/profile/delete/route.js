/**
 * DELETE /api/profile/delete
 * GDPR Article 17: Right to Erasure
 * 
 * Deletes all user data:
 * - Supabase auth account
 * - Profile record
 * - Sentiment votes
 * - Watchlist entries
 * - Any other user-linked data
 * 
 * Requires authenticated session.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req) {
  try {
    // Get user session from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Create client with user's token to verify identity
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Use admin client for deletion operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    )

    const userId = user.id
    const userEmail = user.email
    const deletionLog = []

    // 1. Delete sentiment votes
    const { error: votesErr } = await supabaseAdmin
      .from('token_sentiment_votes')
      .delete()
      .eq('user_id', userId)
    deletionLog.push({ table: 'token_sentiment_votes', success: !votesErr })

    // 2. Delete watchlist entries
    const { error: watchErr } = await supabaseAdmin
      .from('watchlists')
      .delete()
      .eq('user_id', userId)
    deletionLog.push({ table: 'watchlists', success: !watchErr })

    // 3. Delete profile
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    deletionLog.push({ table: 'profiles', success: !profileErr })

    // 4. Delete feedback
    const { error: feedbackErr } = await supabaseAdmin
      .from('feedback')
      .delete()
      .eq('user_id', userId)
    deletionLog.push({ table: 'feedback', success: !feedbackErr })

    // 5. Delete Supabase auth account (this is permanent)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    deletionLog.push({ table: 'auth.users', success: !authErr })

    if (authErr) {
      console.error(`GDPR deletion auth error for ${userId}:`, authErr.message)
      return NextResponse.json({
        error: 'Failed to delete auth account. Please contact support@sonartracker.io',
        partial_deletion: deletionLog,
      }, { status: 500 })
    }

    console.log(`GDPR deletion completed for user ${userId} (${userEmail})`)

    return NextResponse.json({
      message: 'Your account and all associated data have been permanently deleted.',
      deletion_log: deletionLog,
    })
  } catch (err) {
    console.error('GDPR deletion error:', err)
    return NextResponse.json({ error: 'Deletion failed. Contact support@sonartracker.io' }, { status: 500 })
  }
}
