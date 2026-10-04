/**
 * POST /api/onboarding/first-login — the shared post-signup hook
 * =============================================================================
 * Called once per new account by components/onboarding/PostSignupHook, which
 * is mounted globally in ClientRoot, so it runs whatever page a new user lands
 * on (Google sign-ups land on /ai-advisor) and however they signed up (email,
 * Google, wallet). Body: { path? } — the page they landed on.
 *
 *   1. Atomic claim: inserts app_cache key `first_login:<uid>` (primary key),
 *      so two tabs or a double mount cannot both run the steps below.
 *   2. Makes sure a user_profile row exists (Google and wallet sign-ups never
 *      got one), without touching an existing row.
 *   3. Logs the `signup` funnel event with the real provider, unless the email
 *      signup route already did (user_metadata.signup_tracked_at).
 *   4. Welcome email: OFF unless WELCOME_EMAIL_ON_FIRST_LOGIN=true. Brevo's
 *      "Welcome message" automation (template 1, then three follow-ups)
 *      already emails every new contact within seconds of signup: 56 sends
 *      for ~50 signups in the 30 days to 2026-10-04, Google sign-ups included.
 *      Switch this on only after that automation's welcome step is turned
 *      off, or new users get two welcome emails.
 *
 * Accounts older than 7 days are left untouched. Auth: Supabase user JWT.
 * Always 200 with { reason } so the caller never retries in a loop.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { sendWelcomeEmail, isDeliverableEmail } from '@/app/lib/email'
import { trackServer } from '@/lib/analytics/trackServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 3600 * 1000

function displayNameOf(u) {
  const m = u?.user_metadata || {}
  return String(m.full_name || m.name || '').trim()
}

function reply(body) {
  return NextResponse.json({ ok: true, ...body }, { headers: NO_STORE })
}

export async function POST(req) {
  const authed = await getUserFromRequest(req)
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })

  let landedOn = null
  try {
    const body = await req.json()
    if (typeof body?.path === 'string') landedOn = body.path.split('?')[0].split('#')[0].slice(0, 120)
  } catch { /* body is optional */ }

  let u = null
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(authed.id)
    u = data?.user || null
  } catch {
    u = null
  }
  if (!u) return reply({ sent: false, reason: 'no_user' })

  const meta = u.user_metadata || {}
  const createdMs = Date.parse(u.created_at || '')
  const isNew = Number.isFinite(createdMs) && Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS
  if (!isNew) return reply({ sent: false, reason: 'not_new' })
  if (meta.first_login_at) return reply({ sent: false, reason: 'already' })

  // 1. Atomic claim (primary-key insert; the loser gets 23505).
  const nowIso = new Date().toISOString()
  const { error: claimErr } = await supabaseAdmin
    .from('app_cache')
    .insert({ key: `first_login:${u.id}`, value: { at: nowIso, path: landedOn } })
  if (claimErr) {
    return reply({ sent: false, reason: claimErr.code === '23505' ? 'already' : 'claim_failed' })
  }

  // Wallet sign-ins are created with admin.createUser (provider 'email') and
  // tagged user_metadata.signup_method = 'wallet'.
  const provider = meta.signup_method === 'wallet' ? 'wallet' : (u.app_metadata?.provider || 'email')

  // 2 + 3. Profile row and signup event, in parallel.
  await Promise.allSettled([
    supabaseAdmin
      .from('user_profile')
      .upsert({ user_id: u.id, personalization_dismissed: true }, { onConflict: 'user_id', ignoreDuplicates: true }),
    meta.signup_tracked_at
      ? Promise.resolve(false)
      : trackServer(supabaseAdmin, {
          userId: u.id,
          event: 'signup',
          props: { method: provider, via: 'first_login' },
          path: landedOn,
        }),
  ])

  // 4. Optional welcome email (see header).
  let sent = false
  const emailOn = process.env.WELCOME_EMAIL_ON_FIRST_LOGIN === 'true'
  if (emailOn && !meta.welcome_email_sent_at && isDeliverableEmail(u.email)) {
    try {
      sent = !!(await sendWelcomeEmail(u.email, displayNameOf(u)))
    } catch {
      sent = false
    }
  }

  // Durable marker on the account itself.
  try {
    await supabaseAdmin.auth.admin.updateUserById(u.id, {
      user_metadata: {
        ...meta,
        first_login_at: nowIso,
        ...(meta.signup_tracked_at ? {} : { signup_tracked_at: nowIso }),
        ...(sent ? { welcome_email_sent_at: nowIso, welcome_email_via: 'first_login' } : {}),
      },
    })
  } catch { /* the app_cache claim already guards repeats */ }

  return reply({ sent, reason: sent ? 'sent' : emailOn ? 'email_skipped' : 'email_off', provider })
}
