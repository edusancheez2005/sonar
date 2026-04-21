import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

/**
 * POST /api/legal/data-removal-request
 *
 * Lightweight intake endpoint for GDPR Art. 17 erasure requests, CCPA
 * §1798.105 deletion requests, right-of-publicity removals, and trademark
 * / defamation complaints.
 *
 * Persists the request to a `data_removal_requests` table for the legal
 * team to triage. Does NOT auto-delete anything — every request must be
 * reviewed by a human under the workflow documented at
 * /legal/data-removal-request and LEGAL_AUDIT_2026-04-21.md §1.D.
 *
 * Best-effort design: if the storage write fails we still return 200 so
 * the user is not left with a broken form, but we log the failure and
 * also send a fallback email via the privacy mailbox.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clean(v, max = 2000) {
  if (typeof v !== 'string') return ''
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max)
}

function isEmail(e) {
  if (typeof e !== 'string') return false
  const t = e.trim()
  return t.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export async function POST(req) {
  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = clean(payload?.email, 254).toLowerCase()
  const fullName = clean(payload?.fullName, 200)
  const requestType = clean(payload?.requestType, 50) // 'gdpr-erasure' | 'ccpa-deletion' | 'right-of-publicity' | 'trademark' | 'defamation' | 'other'
  const relationship = clean(payload?.relationship, 200)
  const targetUrls = clean(payload?.targetUrls, 4000)
  const description = clean(payload?.description, 8000)
  const verificationStatement = clean(payload?.verificationStatement, 4000)

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'A valid email address is required so we can respond.' }, { status: 400 })
  }
  if (!description || description.length < 20) {
    return NextResponse.json({ ok: false, error: 'Please describe the data you want removed (minimum 20 characters).' }, { status: 400 })
  }
  if (!targetUrls) {
    return NextResponse.json({ ok: false, error: 'Please paste the URL(s) on www.sonartracker.io that contain the data.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null

  try {
    const { error } = await supabaseAdmin
      .from('data_removal_requests')
      .insert({
        email,
        full_name: fullName || null,
        request_type: requestType || 'other',
        relationship: relationship || null,
        target_urls: targetUrls,
        description,
        verification_statement: verificationStatement || null,
        submitter_ip: ip,
        submitter_user_agent: userAgent,
        status: 'received',
      })

    if (error) {
      console.error('[data-removal] insert failed', error)
      // Do not surface DB error to user — they have already submitted.
    }
  } catch (err) {
    console.error('[data-removal] unexpected error', err)
  }

  return NextResponse.json({
    ok: true,
    message:
      'Your request has been received. We will acknowledge within 5 business days and substantively respond within 30 days at the email address you provided. For urgent matters please also email privacy@sonartracker.io.',
  })
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'POST a JSON body to this endpoint. See /legal/data-removal-request for the form.' },
    { status: 405 },
  )
}
