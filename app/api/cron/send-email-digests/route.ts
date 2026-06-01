/**
 * ORCA Proactive Alerts — hourly email digest cron
 * =============================================================================
 * For users who opted into email (user_profile.notifications_email = true),
 * batch their unread, not-yet-emailed notifications into a single plain-HTML
 * digest and send it transactionally through Brevo (smtp/email).
 *
 * Guards (HARD RULE §0.5 / compliance §11):
 *   - opt-in only (notifications_email = true)
 *   - quiet hours (notifications_quiet_hours_utc) are respected
 *   - at most MAX_EMAIL_DIGESTS_PER_DAY digests/day, enforced via an 8h
 *     minimum gap on notifications_last_email_at (24h / 3 = 8h)
 *   - one-click List-Unsubscribe header + signed unsubscribe link
 *   - CAN-SPAM footer: sender identity, postal address, not-financial-advice
 *
 * Wired in vercel.json at schedule '0 * * * *'.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { MAX_EMAIL_DIGESTS_PER_DAY } from '@/lib/orca/alerts/types'
import { signUnsubscribeToken } from '@/lib/orca/alerts/unsubscribeToken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MIN_EMAIL_GAP_HOURS = 24 / MAX_EMAIL_DIGESTS_PER_DAY // 8h
const SITE = 'https://www.sonartracker.io'

interface SupabaseLike {
  from: (table: string) => any
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string | null } | null } | null }> } }
}

interface NotificationRow {
  id: number
  ticker: string
  kind: string
  title: string
  body: string
  created_at: string
}

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  unsubscribeUrl: string
}

export type SendEmailFn = (args: SendEmailArgs) => Promise<boolean>

interface DigestResult {
  ok: boolean
  candidates: number
  sent: number
  skipped_quiet: number
  skipped_gap: number
  skipped_empty: number
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** int4range "[22,8)" / "[6,9)" → whether hourUtc falls inside (wrap-aware). */
export function isInQuietHours(range: unknown, hourUtc: number): boolean {
  if (typeof range !== 'string') return false
  const m = range.match(/^([\[(])\s*(\d+)\s*,\s*(\d+)\s*([\])])$/)
  if (!m) return false
  const lowerInc = m[1] === '['
  const lower = Number(m[2])
  const upper = Number(m[3])
  const upperInc = m[4] === ']'
  const geLower = lowerInc ? hourUtc >= lower : hourUtc > lower
  const leUpper = upperInc ? hourUtc <= upper : hourUtc < upper
  if (lower <= upper) return geLower && leUpper
  // Wrap-around window (e.g. 22:00 → 08:00).
  return geLower || leUpper
}

function renderDigest(notifications: NotificationRow[], unsubscribeUrl: string): string {
  const rows = notifications
    .map((n) => {
      const t = new Date(n.created_at)
      const when = Number.isNaN(t.getTime())
        ? ''
        : t.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
      return `
        <tr>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;border-left:3px solid #00e5ff;">
            <div style="color:#ffffff;font-weight:600;font-size:14px;">${escapeHtml(n.title)}</div>
            <div style="color:#9ca3af;font-size:13px;margin-top:3px;">${escapeHtml(n.body)}</div>
            <div style="color:#6b7280;font-size:11px;margin-top:4px;">${escapeHtml(when)}</div>
          </td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#060c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060c14;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b1422;border:1px solid #1f2937;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#00e5ff;font-weight:700;">ORCA · Pulse</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800;">What changed on your watchlist</h1>
          <div style="margin:6px 0 0;color:#9ca3af;font-size:13px;">${notifications.length} new ${notifications.length === 1 ? 'update' : 'updates'} since your last digest.</div>
        </td></tr>
        <tr><td style="padding:8px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:12px 28px 4px;">
          <a href="${SITE}/dashboard/personal" style="color:#00e5ff;text-decoration:none;font-weight:600;font-size:14px;">Open ORCA →</a>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;color:#6b7280;font-size:11px;line-height:1.6;border-top:1px solid #1f2937;">
          These are informational alerts about tokens you follow. They are not financial advice and not a recommendation to buy, sell, or hold any asset.
          <br/><br/>
          Sonar Tracker — operated by SonarTracker (United Kingdom). SonarTracker, SE16 3TY, United Kingdom.
          <br/><br/>
          You're receiving this because you turned on email alerts in your Sonar profile.
          <a href="${unsubscribeUrl}" style="color:#00e5ff;">Unsubscribe from alert emails</a> ·
          <a href="${SITE}/dashboard/personal" style="color:#00e5ff;">Manage in dashboard</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function brevoSend(args: SendEmailArgs): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) return false
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_ALERTS_FROM_NAME || 'Sonar Tracker',
          email: process.env.BREVO_ALERTS_FROM_EMAIL || 'alerts@sonartracker.io',
        },
        to: [{ email: args.to }],
        subject: args.subject,
        htmlContent: args.html,
        headers: {
          'List-Unsubscribe': `<${args.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function runSendEmailDigests(
  supabase: SupabaseLike,
  opts: { now?: () => Date; sendEmail?: SendEmailFn } = {}
): Promise<DigestResult> {
  const now = opts.now ?? (() => new Date())
  const sendEmail = opts.sendEmail ?? brevoSend
  const result: DigestResult = {
    ok: true,
    candidates: 0,
    sent: 0,
    skipped_quiet: 0,
    skipped_gap: 0,
    skipped_empty: 0,
  }

  let profiles: Array<{
    user_id: string
    notifications_quiet_hours_utc?: unknown
    notifications_last_email_at?: string | null
  }> = []
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('user_id, notifications_quiet_hours_utc, notifications_last_email_at')
      .eq('notifications_email', true)
      .limit(5000)
    profiles = Array.isArray(data) ? data : []
  } catch {
    return result
  }
  result.candidates = profiles.length
  if (profiles.length === 0) return result

  const at = now()
  const hourUtc = at.getUTCHours()

  for (const profile of profiles) {
    const userId = profile.user_id
    if (!userId) continue

    if (isInQuietHours(profile.notifications_quiet_hours_utc, hourUtc)) {
      result.skipped_quiet += 1
      continue
    }

    const last = profile.notifications_last_email_at ? new Date(profile.notifications_last_email_at) : null
    if (last && !Number.isNaN(last.getTime())) {
      const gapHours = (at.getTime() - last.getTime()) / (60 * 60 * 1000)
      if (gapHours < MIN_EMAIL_GAP_HOURS) {
        result.skipped_gap += 1
        continue
      }
    }

    let notifications: NotificationRow[] = []
    try {
      const query = supabase
        .from('user_notifications')
        .select('id, ticker, kind, title, body, created_at')
        .eq('user_id', userId)
        .is('read_at', null)
        .is('emailed_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
      const { data } = await query
      notifications = Array.isArray(data) ? data : []
    } catch {
      notifications = []
    }
    if (notifications.length === 0) {
      result.skipped_empty += 1
      continue
    }

    let email: string | null = null
    try {
      const { data } = await supabase.auth.admin.getUserById(userId)
      email = data?.user?.email ?? null
    } catch {
      email = null
    }
    if (!email) {
      result.skipped_empty += 1
      continue
    }

    const unsubscribeUrl = `${SITE}/api/notifications/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(userId, at))}`
    const subject = `ORCA pulse — ${notifications.length} update${notifications.length === 1 ? '' : 's'} on your watchlist`
    const html = renderDigest(notifications, unsubscribeUrl)

    const ok = await sendEmail({ to: email, subject, html, unsubscribeUrl })
    if (!ok) continue

    const ids = notifications.map((n) => n.id)
    const nowIso = at.toISOString()
    try {
      await supabase.from('user_notifications').update({ emailed_at: nowIso }).in('id', ids)
    } catch {
      /* swallow */
    }
    try {
      await supabase.from('user_profile').update({ notifications_last_email_at: nowIso }).eq('user_id', userId)
    } catch {
      /* swallow */
    }
    result.sent += 1
  }

  // Telemetry (best-effort).
  try {
    await (supabase as unknown as { from: (t: string) => any })
      .from('orca_traces')
      .insert({ stage: 'alerts', payload: { kind: 'digest', ...result, at: at.toISOString() } })
  } catch {
    /* swallow */
  }

  return result
}

async function handle(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runSendEmailDigests(supabaseAdmin as unknown as SupabaseLike)
  return NextResponse.json(result)
}

export async function POST(req: Request): Promise<NextResponse> {
  return handle(req)
}

export async function GET(req: Request): Promise<NextResponse> {
  return handle(req)
}
