/**
 * ORCA Proactive Alerts — evaluation cron (every ~5 minutes)
 * =============================================================================
 * Thin HTTP wrapper. The evaluation core lives in
 * `lib/orca/alerts/runCheckUserAlerts.ts` so this route module only exports the
 * reserved Next.js fields (Next.js rejects any non-reserved route export).
 *
 * Wired in vercel.json at schedule '* /5 * * * *'.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import type { SupabaseLike } from '@/lib/orca/alerts/evaluators'
import { runCheckUserAlerts } from '@/lib/orca/alerts/runCheckUserAlerts'
import { emailPendingNotifications } from '@/lib/orca/alerts/emailNotifications'
import { sendAlertEmail, isDeliverableEmail } from '@/app/lib/email'
import { emailStateOf, requestAlertEmailConsent } from '@/lib/notifications/emailConsent'
import { unsubscribeUrl } from '@/lib/notifications/emailLinks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

async function handle(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const startedAt = Date.now()
  const result = await runCheckUserAlerts(supabaseAdminFresh as unknown as SupabaseLike)

  // Email delivery for opted-in users with a verified address (cadence and
  // daily cap in emailNotifications). Never fails the run: an email problem
  // must not hide the in-app result.
  let email: unknown = null
  try {
    email = await emailPendingNotifications(supabaseAdminFresh as unknown as SupabaseLike, {
      getRecipient: async (userId: string) => {
        const { data } = await supabaseAdminFresh.auth.admin.getUserById(userId)
        const user = data?.user
        if (!user || !isDeliverableEmail(user.email)) return null
        if (emailStateOf(user as any) !== 'verified') {
          // Opted in before confirming: send the one-time confirmation (never
          // more than once from here) and hold their alert emails until then.
          await requestAlertEmailConsent(supabaseAdminFresh as any, userId, { onlyIfNeverSent: true })
          return null
        }
        return { email: user.email as string, unsubscribeUrl: unsubscribeUrl(userId) }
      },
      sendAlertEmail: (to, items, opts) => sendAlertEmail(to, items, opts),
    }, { deadlineMs: startedAt + 45_000 }) // maxDuration is 60s
  } catch (e) {
    email = { error: e instanceof Error ? e.message : String(e) }
  }
  return NextResponse.json({ ...result, email })
}

export async function POST(req: Request): Promise<NextResponse> {
  return handle(req)
}

export async function GET(req: Request): Promise<NextResponse> {
  return handle(req)
}
