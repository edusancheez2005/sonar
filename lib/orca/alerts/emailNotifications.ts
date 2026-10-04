/**
 * Email delivery for ORCA notifications
 * =============================================================================
 * Runs right after runCheckUserAlerts in the 5-minute cron. Picks up recent
 * notifications that have not been emailed and sends ONE email per user to
 * those who switched alert emails on (user_profile.notifications_email) and
 * whose address is verified (lib/notifications/emailConsent.ts).
 *
 * Cadence (HARD RULE §0.5, MAX_EMAIL_DIGESTS_PER_DAY = 3):
 *   quiet 1/day · balanced 3/day, ≥3h apart · frequent 3/day, ≥1h apart.
 * A row held back by the cap or the gap stays pending (emailed_at NULL) and
 * goes out with the next allowed email, as long as it is under 24h old. Each
 * email lists the newest EMAIL_MAX_ITEMS rows plus a "+N more" line, and every
 * row it covers is stamped emailed_at.
 *
 * The transport is injected so the core stays testable and the cron route is
 * the only place that touches Brevo / auth.admin.
 */
import type { SupabaseLike } from '@/lib/orca/alerts/evaluators'
import { MAX_EMAIL_DIGESTS_PER_DAY, type NotificationStyle } from '@/lib/orca/alerts/types'

export interface PendingNotification {
  id: number | string
  user_id: string
  kind: string
  ticker: string | null
  title: string
  body: string
  payload: Record<string, unknown> | null
  created_at: string
}

export interface Recipient {
  email: string
  unsubscribeUrl?: string | null
}

export interface EmailDeps {
  /** Verified, deliverable address for the user, or null to skip them. */
  getRecipient: (userId: string) => Promise<Recipient | null>
  /** Send one alert email; resolves true when the provider accepted it. */
  sendAlertEmail: (
    to: string,
    items: PendingNotification[],
    opts: { total: number; unsubscribeUrl?: string | null }
  ) => Promise<boolean>
}

export interface EmailResult {
  candidates: number
  users_considered: number
  sent: number
  marked: number
  skipped_opt_out: number
  skipped_recent: number
  skipped_daily_cap: number
  skipped_unverified: number
}

export const EMAIL_LOOKBACK_MS = 24 * 60 * 60 * 1000
export const EMAIL_MAX_ITEMS = 8
export const EMAIL_CAP_BY_STYLE: Record<NotificationStyle, number> = { quiet: 1, balanced: 3, frequent: 3 }
export const EMAIL_MIN_GAP_BY_STYLE: Record<NotificationStyle, number> = {
  quiet: 20 * 3600 * 1000,
  balanced: 3 * 3600 * 1000,
  frequent: 1 * 3600 * 1000,
}

function styleOf(v: unknown): NotificationStyle {
  return v === 'quiet' || v === 'frequent' ? v : 'balanced'
}

function startOfUtcDay(ms: number): string {
  const d = new Date(ms)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function emailPendingNotifications(
  supabase: SupabaseLike,
  deps: EmailDeps,
  opts: { now?: () => Date } = {}
): Promise<EmailResult> {
  const now = opts.now ?? (() => new Date())
  const result: EmailResult = {
    candidates: 0,
    users_considered: 0,
    sent: 0,
    marked: 0,
    skipped_opt_out: 0,
    skipped_recent: 0,
    skipped_daily_cap: 0,
    skipped_unverified: 0,
  }
  const nowMs = now().getTime()
  const sinceIso = new Date(nowMs - EMAIL_LOOKBACK_MS).toISOString()

  // 1. Recent, un-emailed notifications (served by idx_user_notif_email_pending).
  let pending: PendingNotification[] = []
  try {
    const { data } = await supabase
      .from('user_notifications')
      .select('id, user_id, kind, ticker, title, body, payload, created_at')
      .is('emailed_at', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1000)
    pending = (Array.isArray(data) ? data : []) as PendingNotification[]
  } catch {
    return result
  }
  result.candidates = pending.length
  if (pending.length === 0) return result

  const byUser = new Map<string, PendingNotification[]>()
  for (const n of pending) {
    if (!n?.user_id) continue
    const list = byUser.get(n.user_id) ?? []
    list.push(n)
    byUser.set(n.user_id, list)
  }
  result.users_considered = byUser.size
  if (byUser.size === 0) return result
  const userIds = Array.from(byUser.keys())

  // 2. Opt-in, cadence style, last email.
  const prefs = new Map<string, { last: number | null; style: NotificationStyle }>()
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('user_id, notifications_email, notifications_last_email_at, notification_style')
      .in('user_id', userIds)
      .limit(1000)
    for (const row of (Array.isArray(data) ? data : []) as Array<{
      user_id: string
      notifications_email?: boolean | null
      notifications_last_email_at?: string | null
      notification_style?: unknown
    }>) {
      if (row?.user_id && row.notifications_email === true) {
        const last = row.notifications_last_email_at ? Date.parse(row.notifications_last_email_at) : NaN
        prefs.set(row.user_id, { last: Number.isFinite(last) ? last : null, style: styleOf(row.notification_style) })
      }
    }
  } catch {
    return result
  }

  // 3. Emails already sent today: one distinct emailed_at per email.
  const sentToday = new Map<string, Set<string>>()
  const optedIn = userIds.filter((u) => prefs.has(u))
  if (optedIn.length > 0) {
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('user_id, emailed_at')
        .in('user_id', optedIn)
        .gte('emailed_at', startOfUtcDay(nowMs))
        .limit(5000)
      for (const r of (Array.isArray(data) ? data : []) as Array<{ user_id: string; emailed_at: string | null }>) {
        if (!r?.user_id || !r.emailed_at) continue
        const set = sentToday.get(r.user_id) ?? new Set<string>()
        set.add(r.emailed_at)
        sentToday.set(r.user_id, set)
      }
    } catch {
      return result // cannot prove we are under the cap → send nothing this run
    }
  }

  // 4. One email per eligible user.
  for (const [userId, all] of byUser) {
    const pref = prefs.get(userId)
    if (!pref) {
      result.skipped_opt_out += 1
      continue
    }
    const cap = Math.min(EMAIL_CAP_BY_STYLE[pref.style], MAX_EMAIL_DIGESTS_PER_DAY)
    if ((sentToday.get(userId)?.size ?? 0) >= cap) {
      result.skipped_daily_cap += 1
      continue
    }
    if (pref.last !== null && nowMs - pref.last < EMAIL_MIN_GAP_BY_STYLE[pref.style]) {
      result.skipped_recent += 1
      continue
    }
    // Only what fired since the last alert email (rows older than that were
    // either covered then or fired while emails were off).
    const items = pref.last === null ? all : all.filter((n) => Date.parse(n.created_at) > (pref.last as number))
    if (items.length === 0) continue

    let recipient: Recipient | null = null
    try {
      recipient = await deps.getRecipient(userId)
    } catch {
      recipient = null
    }
    if (!recipient?.email) {
      result.skipped_unverified += 1
      continue
    }

    const batch = items.slice(0, EMAIL_MAX_ITEMS)
    let ok = false
    try {
      ok = await deps.sendAlertEmail(recipient.email, batch, { total: items.length, unsubscribeUrl: recipient.unsubscribeUrl ?? null })
    } catch {
      ok = false
    }
    if (!ok) continue
    result.sent += 1

    const stamp = now().toISOString()
    try {
      await supabase
        .from('user_notifications')
        .update({ emailed_at: stamp })
        .in('id', items.map((n) => n.id))
      result.marked += items.length
    } catch {
      /* the next run would re-send; acceptable vs. losing the alert */
    }
    try {
      await supabase
        .from('user_profile')
        .update({ notifications_last_email_at: stamp })
        .eq('user_id', userId)
    } catch {
      /* ignore */
    }
  }
  return result
}
