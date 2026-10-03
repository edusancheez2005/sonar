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
  evaluateWhaleConvergence,
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
  /** wallet_alerts rows folded into user_alerts during this run */
  folded_wallet_alerts: number
}

/**
 * Legacy `wallet_alerts` row (written by the "Set alert" button on wallet
 * pages via /api/alerts) → an evaluable wallet_activity rule. Returns null
 * for rows that cannot be delivered: no owner, inactive, or no address.
 */
export function walletAlertToRule(row: {
  user_id?: string | null
  address?: string | null
  chain?: string | null
  min_usd_value?: number | string | null
  is_active?: boolean | null
}): Omit<AlertRule, 'id'> | null {
  const address = String(row?.address || '').trim()
  const userId = row?.user_id ? String(row.user_id) : ''
  if (!address || !userId) return null
  if (row.is_active === false) return null
  const min = Number(row.min_usd_value)
  return {
    user_id: userId,
    ticker: null,
    kind: 'wallet_activity',
    threshold_pct: null,
    threshold_usd: Number.isFinite(min) && min > 0 ? Math.round(min) : null,
    address,
    chain: row.chain ? String(row.chain) : null,
    enabled: true,
  }
}

/**
 * Fold legacy wallet_alerts into user_alerts so ONE job evaluates and delivers
 * them (2026-10-03: 21 rows existed and nothing had ever evaluated them).
 * Idempotent: rows whose (user, address) already has a wallet_activity rule are
 * skipped; new rules are inserted one by one so a single duplicate cannot
 * abort the batch. Returns the rules created in this run so they are evaluated
 * immediately rather than five minutes later.
 */
async function foldWalletAlerts(
  supabase: SupabaseLike,
  existing: AlertRule[],
  deliverable: Set<string>
): Promise<AlertRule[]> {
  const { data } = await supabase
    .from('wallet_alerts')
    .select('id, user_id, address, chain, alert_type, min_usd_value, is_active')
    .eq('is_active', true)
    .limit(2000)
  const rows = Array.isArray(data) ? data : []
  if (rows.length === 0) return []
  const have = new Set(
    existing
      .filter((r) => r.kind === 'wallet_activity' && r.address)
      .map((r) => `${r.user_id}|${String(r.address).toLowerCase()}`)
  )
  const created: AlertRule[] = []
  for (const row of rows) {
    const rule = walletAlertToRule(row)
    if (!rule || !deliverable.has(rule.user_id)) continue
    const key = `${rule.user_id}|${rule.address!.toLowerCase()}`
    if (have.has(key)) continue
    have.add(key)
    try {
      const { data: ins } = await supabase
        .from('user_alerts')
        .insert(rule)
        .select('id, user_id, ticker, kind, threshold_pct, threshold_usd, address, chain, enabled')
      const made = (Array.isArray(ins) ? ins : []) as AlertRule[]
      created.push(...made)
    } catch {
      /* duplicate or constraint — skip this one */
    }
  }
  return created
}

function startOfUtcDay(at: Date): string {
  const d = new Date(at.getTime())
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function normaliseStyle(value: unknown): NotificationStyle {
  return value === 'quiet' || value === 'frequent' ? value : 'balanced'
}

// Suppress a candidate when an identical-looking notification was created for
// the same rule within this window. The hourly UNIQUE(user,rule,hour) index
// only stops collisions *inside* one hour; a sustained price move or a
// re-surfaced headline would otherwise re-fire near-identically every hour.
const RECENT_DUP_WINDOW_MS = 6 * 60 * 60 * 1000

function rawUrl(copy: NotificationCopy): string {
  const raw = copy.payload?.raw as Record<string, unknown> | undefined
  const url = raw?.url
  return typeof url === 'string' ? url.trim() : ''
}

/**
 * Collapse redundant news candidates: a user who watches both "any news" and
 * "high-impact news" on the same ticker would otherwise get two notifications
 * for one article. When a high-impact (news_high_impact) candidate references
 * the same URL as a news_any candidate, drop the news_any one — the
 * high-impact copy is strictly more informative.
 */
function dropDuplicateNews(
  candidates: Array<{ rule: AlertRule; copy: NotificationCopy }>
): Array<{ rule: AlertRule; copy: NotificationCopy }> {
  const impactUrls = new Set<string>()
  for (const c of candidates) {
    if (c.rule.kind === 'news_high_impact') {
      const u = rawUrl(c.copy)
      if (u) impactUrls.add(u)
    }
  }
  if (impactUrls.size === 0) return candidates
  return candidates.filter((c) => {
    if (c.rule.kind !== 'news_any') return true
    const u = rawUrl(c.copy)
    return !(u && impactUrls.has(u))
  })
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
    folded_wallet_alerts: 0,
  }

  // 1. Owners with in-app notifications enabled, plus their cadence style.
  const styleByUser = new Map<string, NotificationStyle>()
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('user_id, notifications_in_app, notification_style')
      .eq('notifications_in_app', true)
      .limit(5000)
    if (Array.isArray(data)) {
      for (const row of data as Array<{ user_id: string; notification_style?: unknown }>) {
        if (row?.user_id) styleByUser.set(row.user_id, normaliseStyle(row.notification_style))
      }
    } else {
      // Fallback: the notification_style column may not exist yet. Re-query the
      // minimal shape so notifications still flow (default cadence = balanced).
      const { data: basic } = await supabase
        .from('user_profile')
        .select('user_id, notifications_in_app')
        .eq('notifications_in_app', true)
        .limit(5000)
      for (const row of (Array.isArray(basic) ? basic : []) as Array<{ user_id: string }>) {
        if (row?.user_id) styleByUser.set(row.user_id, 'balanced')
      }
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

  // 2b. Fold legacy wallet_alerts into user_alerts (one delivery path).
  try {
    const synced = await foldWalletAlerts(supabase, rules, new Set(styleByUser.keys()))
    if (synced.length > 0) {
      rules.push(...synced)
      result.folded_wallet_alerts = synced.length
    }
  } catch {
    /* best-effort */
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
        pending = evaluatePriceMove(rule.ticker as string, Number(rule.threshold_pct), supabase, now)
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
      case 'whale_convergence':
        pending = evaluateWhaleConvergence(rule.ticker ?? null, Number(rule.threshold_pct) || 3, supabase, now)
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
  const recentCutoff = now().getTime() - RECENT_DUP_WINDOW_MS
  for (const [userId, rawCandidates] of candidatesByUser) {
    const style = styleByUser.get(userId) ?? 'balanced'
    const cap = Math.min(DAILY_CAP_BY_STYLE[style], MAX_INAPP_PER_DAY)

    // Collapse "any news" + "high-impact news" duplicates for the same article.
    const candidates = dropDuplicateNews(rawCandidates)

    let usedToday = 0
    const recentDupKeys = new Set<string>()
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('id, rule_id, title, created_at')
        .eq('user_id', userId)
        .gte('created_at', dayStart)
        .limit(MAX_INAPP_PER_DAY + 1)
      const rows = (Array.isArray(data) ? data : []) as Array<{
        rule_id?: string
        title?: string
        created_at?: string
      }>
      usedToday = rows.length
      for (const r of rows) {
        const ts = r.created_at ? Date.parse(r.created_at) : NaN
        if (Number.isFinite(ts) && ts >= recentCutoff && r.rule_id && r.title) {
          recentDupKeys.add(`${r.rule_id}|${r.title}`)
        }
      }
    } catch {
      usedToday = 0
    }

    // Skip candidates whose (rule, title) already fired in the recent window.
    const deduped = candidates.filter(
      ({ rule, copy }) => !recentDupKeys.has(`${rule.id}|${copy.title}`)
    )
    result.capped += candidates.length - deduped.length

    const remaining = Math.max(0, cap - usedToday)
    if (remaining <= 0) {
      result.capped += deduped.length
      continue
    }
    const allowed = deduped.slice(0, remaining)
    result.capped += deduped.length - allowed.length

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
        folded_wallet_alerts: result.folded_wallet_alerts,
        at: now().toISOString(),
      },
    })
  } catch {
    /* swallow */
  }

  return result
}
