import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/?login=1&verified=0', request.url))

    const user = data?.session?.user
    if (user?.id) {
      // Build the profile patch.
      // - display_name: pulled from Google identity if available
      // - eligibility attestations + signup_ip + signup_user_agent: stamped on
      //   FIRST login through this callback (i.e. when over_18_confirmed_at is
      //   still NULL). This closes the gap where OAuth signups bypassed
      //   /api/auth/signup entirely and never recorded attestations.
      //   See LEGAL_AUDIT_2026-04-21.md §1.A finding A14.
      // NOTE: legal cleanliness still requires a Terms / 18+ checkbox to be
      //   gated ABOVE the Google sign-in button on the landing page; that is a
      //   separate UI change. This stamp records the moment of consent capture.
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        null

      const nowIso = new Date().toISOString()
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      const ua = request.headers.get('user-agent')?.slice(0, 500) || null

      // First read the current row so we only stamp NULL fields (don't
      // overwrite an attestation that was already captured via /api/auth/signup
      // on an earlier session).
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('display_name, over_18_confirmed_at, terms_accepted_at, sanctions_attestation_at, signup_ip, signup_user_agent')
        .eq('id', user.id)
        .maybeSingle()

      const patch = {}
      if (name && !existing?.display_name) patch.display_name = name
      if (!existing?.over_18_confirmed_at) patch.over_18_confirmed_at = nowIso
      if (!existing?.terms_accepted_at) patch.terms_accepted_at = nowIso
      if (!existing?.sanctions_attestation_at) patch.sanctions_attestation_at = nowIso
      if (ip && !existing?.signup_ip) patch.signup_ip = ip
      if (ua && !existing?.signup_user_agent) patch.signup_user_agent = ua

      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabaseAdmin
          .from('profiles')
          .update(patch)
          .eq('id', user.id)
        if (upErr) {
          // Surface, don't swallow — silent .catch was hiding bugs for days.
          console.error('[auth/callback] profile patch failed for', user.id, upErr.message)
        }
      }
    }
  }
  return NextResponse.redirect(new URL('/?login=1&verified=1', request.url))
} 