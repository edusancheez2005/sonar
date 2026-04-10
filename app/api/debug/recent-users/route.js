/**
 * DEBUG: Check recent user signups
 * TEMPORARY — remove after checking
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  
  // Simple auth to prevent public access
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get last 30 profiles
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get auth.users metadata for these users (login providers, last sign in)
    const userDetails = []
    for (const profile of (profiles || [])) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      
      userDetails.push({
        email: profile.email,
        display_name: profile.display_name,
        plan: profile.plan,
        signed_up: profile.created_at,
        provider: authUser?.user?.app_metadata?.provider || 'unknown',
        last_sign_in: authUser?.user?.last_sign_in_at || null,
        sign_in_count: authUser?.user?.app_metadata?.providers?.length || 0,
        email_confirmed: authUser?.user?.email_confirmed_at ? true : false,
        phone: authUser?.user?.phone || null,
      })
    }

    // Analysis
    const total = userDetails.length
    const googleUsers = userDetails.filter(u => u.provider === 'google').length
    const emailUsers = userDetails.filter(u => u.provider === 'email').length
    const confirmed = userDetails.filter(u => u.email_confirmed).length
    const signedInMoreThanOnce = userDetails.filter(u => {
      const signup = new Date(u.signed_up)
      const lastSign = u.last_sign_in ? new Date(u.last_sign_in) : null
      return lastSign && (lastSign.getTime() - signup.getTime()) > 60000 // came back >1min after signup
    }).length
    
    // Bot indicators
    const suspiciousDomains = ['tempmail', 'guerrilla', 'yopmail', 'mailinator', 'throwaway', 'sharklasers', 'grr.la', 'guerrillamail', 'discard.email', 'temp-mail', 'fakeinbox']
    const suspiciousUsers = userDetails.filter(u => {
      const email = (u.email || '').toLowerCase()
      return suspiciousDomains.some(d => email.includes(d))
    })

    return NextResponse.json({
      summary: {
        total,
        google_oauth: googleUsers,
        email_signup: emailUsers,
        email_confirmed: confirmed,
        returned_after_signup: signedInMoreThanOnce,
        suspicious_emails: suspiciousUsers.length,
      },
      bot_assessment: signedInMoreThanOnce > total * 0.3 
        ? 'LIKELY REAL — users are returning after initial signup'
        : suspiciousUsers.length > total * 0.5
          ? 'LIKELY BOTS — many disposable email domains'
          : 'MIXED — check individual users below',
      users: userDetails,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
