import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const e = email.trim()
  if (!e || e.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export async function POST(req) {
  try {
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Use standard signUp — respects Supabase "Confirm email" setting
    // User receives a verification email and must click the link before signing in
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.sonartracker.io'}/auth/callback`,
      },
    })

    if (error) {
      const msg = String(error?.message || '')
      if (/already\s*(been\s*)?registered/i.test(msg) || /user.*already.*exists/i.test(msg)) {
        return NextResponse.json({ 
          ok: false, 
          error: 'An account with this email already exists. Please sign in instead.',
          alreadyExists: true 
        }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: msg || 'Failed to create account' }, { status: 400 })
    }

    // If email confirmation is required, user won't have a confirmed session yet
    const needsConfirmation = data?.user?.identities?.length === 0 || 
                               data?.user?.email_confirmed_at === null

    return NextResponse.json({ 
      ok: true, 
      userId: data?.user?.id || null,
      needsConfirmation: needsConfirmation !== false,
      message: 'Check your email for a verification link to complete signup.'
    })
  } catch (err) {
    const msg = (err && typeof err.message === 'string') ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
