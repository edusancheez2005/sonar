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
import { sendAlertEmail } from '@/app/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

async function handle(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runCheckUserAlerts(supabaseAdminFresh as unknown as SupabaseLike)

  // Email delivery for opted-in users (one email / user / hour). Never fails
  // the run: an email problem must not hide the in-app result.
  let email: unknown = null
  try {
    email = await emailPendingNotifications(supabaseAdminFresh as unknown as SupabaseLike, {
      getEmail: async (userId: string) => {
        const { data } = await supabaseAdminFresh.auth.admin.getUserById(userId)
        return data?.user?.email || null
      },
      sendAlertEmail: (to, items) => sendAlertEmail(to, items),
    })
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
