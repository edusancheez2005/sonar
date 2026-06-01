/**
 * ORCA Proactive Alerts — evaluation core (every ~5 minutes)
 * =============================================================================
 * For every enabled user_alerts rule whose owner has in-app notifications on,
 * evaluate the rule against canonical public tables and, when it fires, insert
 * a deduplicated row into user_notifications. Per-user daily caps are enforced
 * by notification_style (HARD RULE §0.5).
 *
 *   - No new data endpoints: evaluators read public tables directly.
 *   - Dedup: UNIQUE (user_id, rule_id, dedup_hour) + ON CONFLICT DO NOTHING.
 *   - Caps: DAILY_CAP_BY_STYLE, hard-bounded by MAX_INAPP_PER_DAY.
 *   - Telemetry: one orca_traces row (stage='alerts') per run.
 *
 * Kept out of the route module so Next.js route validation only sees the
 * reserved HTTP exports. The cron route imports runCheckUserAlerts from here.
 */
import {
  evaluatePriceMove,
  evaluateWhaleFlow,
  evaluateSignalFlip,
  evaluateNewsImpact,
  evaluateWalletActivity,
  evaluateNewsAny,
  evaluateSocialPost,
  type SupabaseLike,
} from '@/lib/orca/alerts/evaluators'
import { dedupHour } from '@/lib/orca/alerts/dedup'
import {
  DAILY_CAP_BY_STYLE,
  MAX_INAPP_PER_DAY,
  type AlertRule,
  type NotificationCopy,
  type NotificationStyle,
} from '@/lib/orca/alerts/types'

export interface CheckResult {
  ok: boolean
  rules_evaluated: number
  triggered: number
  inserted: number
  capped: number
}

function startOfUtcDay(at: Date): string {
  const d = new Date(at.getTime())
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function normaliseStyle(value: unknown): NotificationStyle {
  return value === 'quiet' || value === 'frequent' ? value : 'balanced'
}

/**
 * Pure-ish core so tests can drive it with a mocked Supabase client.
 * Returns counts; never throws (every read is defensively wrapped).
 */
export async function runCheckUserAlerts(
  supabase: SupabaseLike,
  opts: { now?: () => Date } = {}
): Promise<CheckResult> {
  const now = opts.now ?? (() => new Date())
  const result: CheckResult = {
    ok: true,
    rules_evaluated: 0,
    triggered: 0,
    inserted: 0,
    capped: 0,
  }

  // 1. Owners with in-app notifications enabled, plus their cadence style.
  const styleByUser = new Map<string, NotificationStyle>()
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('user_id, notifications_in_app, notification_style')
      .eq('notifications_in_app', true)
      .limit(5000)
    for (const row of (Array.isArray(data) ? data : []) as Array<{
      user_id: string
      notification_style?: unknown
    }>) {
      if (row?.user_id) styleByUser.set(row.user_id, normaliseStyle(row.notification_style))
    }
  } catch {
    return result
  }
  if (styleByUser.size === 0) return result

  // 2. Enabled rules belonging to those owners.
  let rules: AlertRule[] = []
  try {
    const { data } = await supabase
      .from('user_alerts')
      .select('id, user_id, ticker, kind, threshold_pct, threshold_usd, address, chain, enabled')
      .eq('enabled', true)
      .limit(10000)
    rules = ((Array.isArray(data) ? data : []) as AlertRule[]).filter((r) =>
      styleByUser.has(r.user_id)
    )
  } catch {
    return result
  }
  result.rules_evaluated = rules.length
  if (rules.length === 0) return result

  // 3. Evaluate each rule, memoising shared reads by (kind, ticker, threshold).
  const memo = new Map<string, Promise<NotificationCopy | null>>()
  const evaluate = (rule: AlertRule): Promise<NotificationCopy | null> => {
    const key = `${rule.kind}|${rule.ticker ?? rule.address ?? ''}|${rule.threshold_pct ?? ''}|${rule.threshold_usd ?? ''}|${rule.chain ?? ''}`
    const cached = memo.get(key)
    if (cached) return cached
    let pending: Promise<NotificationCopy | null>
    switch (rule.kind) {
      case 'price_move':
        pending = evaluatePriceMove(rule.ticker as string, Number(rule.threshold_pct), supabase)
        break
      case 'whale_flow':
        pending = evaluateWhaleFlow(rule.ticker as string, Number(rule.threshold_usd), supabase, now)
        break
      case 'signal_flip':
        pending = evaluateSignalFlip(rule.ticker as string, supabase)
        break
      case 'news_high_impact':
        pending = evaluateNewsImpact(rule.ticker as string, supabase, now)
        break
      case 'wallet_activity':
        pending = evaluateWalletActivity(
          rule.address ?? '',
          rule.threshold_usd ?? null,
          rule.chain ?? null,
          supabase,
          now
        )
        break
      case 'news_any':
        pending = evaluateNewsAny(rule.ticker as string, supabase, now)
        break
      case 'social_post':
        pending = evaluateSocialPost(rule.ticker as string, supabase, now)
        break
      default:
        pending = Promise.resolve(null)
    }
    memo.set(key, pending)
    return pending
  }

  const hour = dedupHour(now())
  type Candidate = { rule: AlertRule; copy: NotificationCopy }
  const candidatesByUser = new Map<string, Candidate[]>()

  const evaluated = await Promise.all(
    rules.map(async (rule) => ({ rule, copy: await evaluate(rule) }))
  )
  for (const { rule, copy } of evaluated) {
    if (!copy) continue
    result.triggered += 1
    const list = candidatesByUser.get(rule.user_id) ?? []
    list.push({ rule, copy })
    candidatesByUser.set(rule.user_id, list)
  }
  if (candidatesByUser.size === 0) return result

  // 4. Per-user daily cap, then deduplicated insert.
  const dayStart = startOfUtcDay(now())
  for (const [userId, candidates] of candidatesByUser) {
    const style = styleByUser.get(userId) ?? 'balanced'
    const cap = Math.min(DAILY_CAP_BY_STYLE[style], MAX_INAPP_PER_DAY)

    let usedToday = 0
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', dayStart)
        .limit(MAX_INAPP_PER_DAY + 1)
      usedToday = Array.isArray(data) ? data.length : 0
    } catch {
      usedToday = 0
    }

    const remaining = Math.max(0, cap - usedToday)
    if (remaining <= 0) {
      result.capped += candidates.length
      continue
    }
    const allowed = candidates.slice(0, remaining)
    result.capped += candidates.length - allowed.length

    const rows = allowed.map(({ rule, copy }) => ({
      user_id: userId,
      rule_id: rule.id,
      ticker: rule.ticker ?? copy.payload.ticker,
      kind: rule.kind,
      title: copy.title,
      body: copy.body,
      payload: copy.payload,
      dedup_hour: hour,
    }))
    try {
      const { data } = await supabase
        .from('user_notifications')
        .upsert(rows, { onConflict: 'user_id,rule_id,dedup_hour', ignoreDuplicates: true })
        .select('id')
      result.inserted += Array.isArray(data) ? data.length : 0
    } catch {
      /* swallow — a broken insert for one user must not abort the run */
    }
  }

  // 5. Telemetry (best-effort).
  try {
    await supabase.from('orca_traces').insert({
      stage: 'alerts',
      payload: {
        kind: 'check',
        rules_evaluated: result.rules_evaluated,
        triggered: result.triggered,
        inserted: result.inserted,
        capped: result.capped,
        at: now().toISOString(),
      },
    })
  } catch {
    /* swallow */
  }

  return result
}
