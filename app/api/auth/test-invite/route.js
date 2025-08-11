import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

function serializeError(err) {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err.message) return err.message
  try { return JSON.stringify(err) } catch { return String(err) }
}

export async function POST(request) {
  try {
    const { email, redirectTo, password } = await request.json()
    if (!email) return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 })

    const rt = redirectTo || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'}/auth/callback`

    // 1) Try SMTP invite (to test actual email delivery)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: rt })
    if (!error) return NextResponse.json({ ok: true, mode: 'invite', data })

    // 2) Fallback: generate link
    // If a password is provided, create a signup link; otherwise use magic link
    const useType = password ? 'signup' : 'magiclink'
    const payload = password ? { type: 'signup', email, password, options: { redirectTo: rt } } : { type: 'magiclink', email, options: { redirectTo: rt } }

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink(payload)
    if (linkErr) {
      return NextResponse.json({ ok: false, error: serializeError(linkErr), smtpError: serializeError(error) }, { status: 400 })
    }
    return NextResponse.json({ ok: true, mode: useType, action_link: linkData?.properties?.action_link, smtpError: serializeError(error) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: serializeError(e) }, { status: 500 })
  }
} 