/**
 * Email delivery for ORCA notifications
 * =============================================================================
 * Runs right after runCheckUserAlerts in the 5-minute cron. Picks up the
 * notifications inserted recently that have not been emailed, groups them per
 * user, and sends ONE email per user to those who opted in
 * (user_profile.notifications_email = true), at most once an hour
 * (notifications_last_email_at). Rows that go out get emailed_at stamped.
 *
 * The transport is injected so the core stays testable and the cron route is
 * the only place that touches Brevo / auth.admin.
 */
import type { SupabaseLike } from '@/lib/orca/alerts/evaluators'

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

export interface EmailDeps {
  /** Resolve a user's email (auth.admin.getUserById in production). */
  getEmail: (userId: string) => Promise<string | null>
  /** Send the digest; resolves true when accepted by the provider. */
  sendAlertEmail: (to: string, items: PendingNotification[]) => Promise<boolean>
}

export interface EmailResult {
  candidates: number
  users_considered: number
  sent: number
  marked: number
  skipped_opt_out: number
  skipped_recent: number
}

export const EMAIL_LOOKBACK_MS = 15 * 60 * 1000 // 3 cron ticks
export const EMAIL_MIN_GAP_MS = 60 * 60 * 1000 // 1 email / user / hour
export const EMAIL_MAX_ITEMS = 8

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
  }
  const nowMs = now().getTime()
  const sinceIso = new Date(nowMs - EMAIL_LOOKBACK_MS).toISOString()

  // 1. Recent, un-emailed notifications.
  let pending: PendingNotification[] = []
  try {
    const { data } = await supabase
      .from('user_notifications')
      .select('id, user_id, kind, ticker, title, body, payload, created_at')
      .is('emailed_at', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(500)
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

  // 2. Opt-in + cadence.
  const optIn = new Map<string, { last: number | null }>()
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('user_id, notifications_email, notifications_last_email_at')
      .in('user_id', Array.from(byUser.keys()))
      .limit(1000)
    for (const row of (Array.isArray(data) ? data : []) as Array<{
      user_id: string
      notifications_email?: boolean | null
      notifications_last_email_at?: string | null
    }>) {
      if (row?.user_id && row.notifications_email === true) {
        const last = row.notifications_last_email_at ? Date.parse(row.notifications_last_email_at) : NaN
        optIn.set(row.user_id, { last: Number.isFinite(last) ? last : null })
      }
    }
  } catch {
    return result
  }

  // 3. One email per eligible user.
  for (const [userId, items] of byUser) {
    const pref = optIn.get(userId)
    if (!pref) {
      result.skipped_opt_out += 1
      continue
    }
    if (pref.last !== null && nowMs - pref.last < EMAIL_MIN_GAP_MS) {
      result.skipped_recent += 1
      continue
    }
    let email: string | null = null
    try {
      email = await deps.getEmail(userId)
    } catch {
      email = null
    }
    if (!email) continue

    const batch = items.slice(0, EMAIL_MAX_ITEMS)
    let ok = false
    try {
      ok = await deps.sendAlertEmail(email, batch)
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
