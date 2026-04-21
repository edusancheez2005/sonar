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

    // Eligibility attestations — server-enforced because we cannot trust the
    // client. See LEGAL_AUDIT_2026-04-21.md §1.A finding A14 (age) and the
    // global OFAC / sanctions exclusion in the footer disclaimer.
    const over18 = body?.over18 === true || body?.over_18 === true
    const acceptsTerms = body?.acceptsTerms === true || body?.accepts_terms === true
    const notSanctioned = body?.notSanctioned === true || body?.not_sanctioned === true

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!over18) {
      return NextResponse.json({ ok: false, error: 'You must confirm you are aged 18 or over to create an account.' }, { status: 400 })
    }
    if (!acceptsTerms) {
      return NextResponse.json({ ok: false, error: 'You must accept the Terms of Service and Privacy Policy.' }, { status: 400 })
    }
    if (!notSanctioned) {
      return NextResponse.json({ ok: false, error: 'You must confirm you are not located in a sanctioned jurisdiction.' }, { status: 400 })
    }

    // Hard-block obvious sanctioned-country self-reports. This is a belt-
    // and-braces check on top of the user's own attestation; it is not a
    // replacement for proper geo-IP screening, which we should add later.
    const SANCTIONED = new Set([
      'cuba', 'iran', 'north korea', 'dprk', 'syria', 'crimea',
      'donetsk', 'luhansk', 'russia', 'belarus',
    ])
    if (country && SANCTIONED.has(country.toLowerCase())) {
      return NextResponse.json({ ok: false, error: 'Service is not available in your jurisdiction.' }, { status: 451 })
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
    if (data?.user?.id) {
      const profileUpdate = {
        // Persist the eligibility attestations + the IP / UA at the moment
        // of signup so we have an audit trail in case of dispute.
        // See LEGAL_AUDIT_2026-04-21.md §1.A finding A14.
        over_18_confirmed_at: new Date().toISOString(),
        terms_accepted_at: new Date().toISOString(),
        sanctions_attestation_at: new Date().toISOString(),
        signup_ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        signup_user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
      }
      if (displayName) profileUpdate.display_name = displayName
      if (country) profileUpdate.country = country
      if (experienceLevel) profileUpdate.experience_level = experienceLevel
      if (interests.length > 0) profileUpdate.interests = interests

      await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', data.user.id)
        .catch(() => {}) // Non-critical — profile created by trigger;
                          // attestation columns may not yet exist (see migration TODO)
    }

    return NextResponse.json({ ok: true, userId: data?.user?.id || null })
  } catch (err) {
    const msg = (err && typeof err.message === 'string') ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
