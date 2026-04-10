import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

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
    const displayName = String(body?.displayName || '').trim().slice(0, 100)
    const country = String(body?.country || '').trim().slice(0, 100)
    const experienceLevel = String(body?.experienceLevel || '').trim().slice(0, 30)
    const interests = Array.isArray(body?.interests) ? body.interests.slice(0, 10).map(i => String(i).slice(0, 50)) : []

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Create user (auto-confirmed — email verification disabled until SMTP is configured)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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

    // Update profile with extra fields
    if (data?.user?.id && (displayName || country || experienceLevel || interests.length > 0)) {
      const profileUpdate = {}
      if (displayName) profileUpdate.display_name = displayName
      if (country) profileUpdate.country = country
      if (experienceLevel) profileUpdate.experience_level = experienceLevel
      if (interests.length > 0) profileUpdate.interests = interests

      await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', data.user.id)
        .catch(() => {}) // Non-critical — profile created by trigger
    }

    return NextResponse.json({ ok: true, userId: data?.user?.id || null })
  } catch (err) {
    const msg = (err && typeof err.message === 'string') ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
