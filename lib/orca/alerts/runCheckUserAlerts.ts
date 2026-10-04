/**
 * ORCA Proactive Alerts — evaluation core (every ~5 minutes)
 * =============================================================================
 * For every enabled user_alerts rule whose owner has not switched in-app
 * notifications off, evaluate the rule against canonical public tables and,
 * when it fires, insert a deduplicated row into user_notifications. Per-user
 * daily caps are enforced by notification_style (HARD RULE §0.5).
 *
 * Owners with NO user_profile row are deliverable at the default cadence
 * (notifications_in_app defaults to true; most Google sign-ups never got a
 * row, and before 2026-10-04 their alerts were silently skipped).
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
import { normaliseAddress } from '@/lib/orca/alerts/validate'
import { formatWalletActivityFromTxs, type WalletTx } from '@/lib/orca/alerts/format'
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

/** Default floor for a legacy "Large transaction" alert saved without a minimum. */
export const LARGE_TX_DEFAULT_USD = 100_000

const SOLANA_LIKE_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const BITCOIN_RE = /^(?:[13][1-9A-HJ-NP-Za-km-z]{25,34}|bc1[02-9ac-hj-np-z]{11,71})$/
const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/
const NON_EVM_CHAINS = new Set(['solana', 'bitcoin', 'tron'])

export interface WalletAlertRow {
  id?: string
  user_id?: string | null
  address?: string | null
  chain?: string | null
  alert_type?: string | null
  min_usd_value?: number | string | null
  is_active?: boolean | null
  created_at?: string | null
}

/**
 * The USD floor a legacy wallet_alerts row asked for: its min_usd_value when
 * set; $100K for "large_transaction" saved without one (the modal's
 * placeholder); otherwise null = any valued move. token_transfer / new_token
 * have no dedicated evaluator yet and fold as any valued move.
 */
export function effectiveWalletThreshold(row: WalletAlertRow): number | null {
  const min = Number(row?.min_usd_value)
  if (Number.isFinite(min) && min > 0) return Math.round(min)
  if (String(row?.alert_type || '') === 'large_transaction') return LARGE_TX_DEFAULT_USD
  return null
}

/**
 * Chain stored on a wallet rule. EVM addresses are chain-agnostic (null): the
 * same address is the same owner on every EVM chain. Non-EVM addresses keep
 * their real chain — from the legacy row when it names one, else by shape
 * (Bitcoin and Tron base58 must not be mistaken for Solana).
 */
export function ruleChainFor(address: string, hint?: string | null): string | null {
  const a = String(address || '').trim()
  if (!a || a.startsWith('0x')) return null
  const h = String(hint || '').trim().toLowerCase()
  if (NON_EVM_CHAINS.has(h)) return h
  if (BITCOIN_RE.test(a)) return 'bitcoin'
  if (TRON_RE.test(a)) return 'tron'
  return SOLANA_LIKE_RE.test(a) ? 'solana' : null
}

/**
 * Legacy `wallet_alerts` row (written by the "Set alert" button on wallet
 * pages via /api/alerts) → an evaluable wallet_activity rule. Returns null
 * for rows that cannot be delivered: no owner, inactive, or an address that
 * fails validation (it would otherwise reach a PostgREST .or() filter).
 */
export function walletAlertToRule(row: WalletAlertRow): Omit<AlertRule, 'id'> | null {
  const address = normaliseAddress(row?.address)
  const userId = row?.user_id ? String(row.user_id) : ''
  if (!address || !userId) return null
  if (row.is_active === false) return null
  return {
    user_id: userId,
    ticker: null,
    kind: 'wallet_activity',
    threshold_pct: null,
    threshold_usd: effectiveWalletThreshold(row),
    address,
    chain: ruleChainFor(address, row.chain),
    enabled: true,
  }
}

/**
 * Several legacy rows for the same (user, address) become ONE rule with the
 * most permissive floor: any row without a floor wins; otherwise the lowest.
 */
export function mergeWalletAlertRows(rows: WalletAlertRow[]): Array<Omit<AlertRule, 'id'>> {
  const merged = new Map<string, Omit<AlertRule, 'id'>>()
  for (const row of rows) {
    const rule = walletAlertToRule(row)
    if (!rule) continue
    const key = `${rule.user_id}|${rule.address}`
    const prev = merged.get(key)
    if (!prev) {
      merged.set(key, rule)
      continue
    }
    const a = prev.threshold_usd
    const b = rule.threshold_usd
    prev.threshold_usd = a === null || b === null ? null : Math.min(a, b)
  }
  return Array.from(merged.values())
}

function walletKey(userId: string, address: string | null | undefined): string {
  const a = String(address || '').trim()
  return `${userId}|${a.startsWith('0x') ? a.toLowerCase() : a}`
}

/**
 * Fold legacy wallet_alerts into user_alerts so ONE job evaluates and delivers
 * them (2026-10-03: 21 rows existed and nothing had ever evaluated them).
 * Idempotent: (user, address) pairs that already have a wallet_activity rule —
 * enabled or not — are skipped, and the partial unique index catches races.
 * Deleting the folded rule in the Alerts tab retires the legacy rows
 * (lib/orca/alerts/walletAlertSync), so a deleted rule does not come back.
 * Returns the rules created in this run so they are evaluated immediately.
 */
async function foldWalletAlerts(supabase: SupabaseLike): Promise<AlertRule[]> {
  const { data } = await supabase
    .from('wallet_alerts')
    .select('id, user_id, address, chain, alert_type, min_usd_value, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(2000)
  const rows = (Array.isArray(data) ? data : []) as WalletAlertRow[]
  if (rows.length === 0) return []
  const wanted = mergeWalletAlertRows(rows)
  if (wanted.length === 0) return []

  // Existing wallet rules for these owners, including disabled ones.
  const owners = Array.from(new Set(wanted.map((r) => r.user_id)))
  const have = new Set<string>()
  for (let i = 0; i < owners.length; i += 150) {
    const { data: existing, error } = await supabase
      .from('user_alerts')
      .select('user_id, address')
      .eq('kind', 'wallet_activity')
      .in('user_id', owners.slice(i, i + 150))
      .limit(5000)
    if (error || !Array.isArray(existing)) return [] // cannot prove absence → fold nothing this run
    for (const r of existing as Array<{ user_id: string; address: string | null }>) have.add(walletKey(r.user_id, r.address))
  }

  const created: AlertRule[] = []
  for (const rule of wanted) {
    const key = walletKey(rule.user_id, rule.address)
    if (have.has(key)) continue
    have.add(key)
    try {
      const { data: ins } = await supabase
        .from('user_alerts')
        .insert(rule)
        .select('id, user_id, ticker, kind, threshold_pct, threshold_usd, address, chain, enabled')
      created.push(...((Array.isArray(ins) ? ins : []) as AlertRule[]))
    } catch {
      /* duplicate or constraint — skip this one */
    }
  }
  return created
}

/**
 * Display names for wallet rules: curated entities (Binance, Vitalik…) keyed
 * by lower-cased EVM address / exact Solana address. ~250 small rows.
 */
async function loadCuratedLabels(supabase: SupabaseLike): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  try {
    const { data } = await supabase
      .from('curated_entities')
      .select('display_name, addresses')
      .eq('submission_status', 'approved')
      .limit(2000)
    for (const e of (Array.isArray(data) ? data : []) as Array<{ display_name?: string; addresses?: unknown }>) {
      const name = typeof e?.display_name === 'string' ? e.display_name.trim() : ''
      if (!name || !Array.isArray(e.addresses)) continue
      for (const a of e.addresses as Array<{ address?: string }>) {
        const addr = typeof a?.address === 'string' ? a.address.trim() : ''
        if (!addr) continue
        const k = addr.startsWith('0x') ? addr.toLowerCase() : addr
        if (!labels.has(k)) labels.set(k, name)
      }
    }
  } catch {
    /* unnamed titles are fine */
  }
  return labels
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
// Wallet alerts remember which tx hashes they already notified for this long.
const WALLET_DEDUP_LOOKBACK_MS = 24 * 60 * 60 * 1000
// A busy wallet (an exchange hot wallet) may notify at most this often per day,
// so it cannot crowd the user's other alerts out of the daily cap.
export const WALLET_RULE_DAILY_CAP = 3

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


const PROFILE_CHUNK = 150

/**
 * Notification settings for the given rule owners. Returns the cadence per
 * deliverable owner. An owner without a profile row gets the default
 * ('balanced'); an owner with notifications_in_app=false is left out; owners
 * whose chunk could not be read are left out too (fail closed — never notify
 * someone who may have opted out).
 */
async function loadOwnerStyles(
  supabase: SupabaseLike,
  owners: string[]
): Promise<Map<string, NotificationStyle>> {
  const styles = new Map<string, NotificationStyle>()
  for (let i = 0; i < owners.length; i += PROFILE_CHUNK) {
    const chunk = owners.slice(i, i + PROFILE_CHUNK)
    let rows: Array<{ user_id: string; notifications_in_app?: boolean | null; notification_style?: unknown }> | null = null
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('user_id, notifications_in_app, notification_style')
        .in('user_id', chunk)
      if (!error && Array.isArray(data)) rows = data
    } catch {
      rows = null
    }
    if (rows === null) {
      // notification_style may be missing in an older schema; retry minimal.
      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('user_id, notifications_in_app')
          .in('user_id', chunk)
        if (!error && Array.isArray(data)) rows = data
      } catch {
        rows = null
      }
    }
    if (rows === null) continue // fail closed for this chunk
    const byId = new Map(rows.filter((r) => r?.user_id).map((r) => [r.user_id, r]))
    for (const uid of chunk) {
      const row = byId.get(uid)
      if (row && row.notifications_in_app === false) continue
      styles.set(uid, normaliseStyle(row?.notification_style))
    }
  }
  return styles
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

  // 1. Every enabled rule.
  let rules: AlertRule[] = []
  try {
    const { data } = await supabase
      .from('user_alerts')
      .select('id, user_id, ticker, kind, threshold_pct, threshold_usd, address, chain, enabled')
      .eq('enabled', true)
      .limit(10000)
    rules = (Array.isArray(data) ? data : []) as AlertRule[]
  } catch {
    return result
  }

  // 2. Fold legacy wallet_alerts into user_alerts (one delivery path).
  try {
    const synced = await foldWalletAlerts(supabase)
    if (synced.length > 0) {
      rules.push(...synced)
      result.folded_wallet_alerts = synced.length
    }
  } catch {
    /* best-effort */
  }

  // 3. Owners' cadence; drop rules whose owner switched in-app off.
  const owners = Array.from(new Set(rules.map((r) => r.user_id).filter(Boolean)))
  const styleByUser = owners.length > 0 ? await loadOwnerStyles(supabase, owners) : new Map<string, NotificationStyle>()
  rules = rules.filter((r) => styleByUser.has(r.user_id))
  result.rules_evaluated = rules.length
  if (rules.length === 0) return result

  // 4. Evaluate each rule, memoising shared reads by (kind, ticker, threshold).
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

  // Names for wallet titles ("Binance moved $42M"), only when one fired.
  const walletFired = evaluated.some(({ rule, copy }) => !!copy && rule.kind === 'wallet_activity')
  const labels = walletFired ? await loadCuratedLabels(supabase) : new Map<string, string>()

  // 5. Per-user dedup and daily cap, then insert.
  const nowMs = now().getTime()
  const dayStartIso = startOfUtcDay(now())
  const dayStartMs = Date.parse(dayStartIso)
  const recentCutoff = nowMs - RECENT_DUP_WINDOW_MS
  const lookbackIso = new Date(Math.min(dayStartMs, nowMs - WALLET_DEDUP_LOOKBACK_MS)).toISOString()
  const hourStartMs = Date.parse(hour)
  for (const [userId, rawCandidates] of candidatesByUser) {
    const style = styleByUser.get(userId) ?? 'balanced'
    const cap = Math.min(DAILY_CAP_BY_STYLE[style], MAX_INAPP_PER_DAY)

    // Collapse "any news" + "high-impact news" duplicates for the same article.
    const candidates = dropDuplicateNews(rawCandidates)

    let usedToday = 0
    const recentDupKeys = new Set<string>()
    // Every tx hash any of this user's wallet alerts already notified: one
    // on-chain move seen by two followed addresses notifies once, ever.
    const notifiedTxUser = new Set<string>()
    const perRuleToday = new Map<string, number>()
    const firedThisHour = new Set<string>()
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('id, rule_id, kind, title, payload, created_at')
        .eq('user_id', userId)
        .gte('created_at', lookbackIso)
        .limit(300)
      const rows = (Array.isArray(data) ? data : []) as Array<{
        rule_id?: string
        kind?: string
        title?: string
        payload?: { raw?: { txHashes?: unknown } } | null
        created_at?: string
      }>
      for (const r of rows) {
        const ts = r.created_at ? Date.parse(r.created_at) : NaN
        if (!Number.isFinite(ts) || ts >= dayStartMs) {
          usedToday += 1
          if (r.rule_id) perRuleToday.set(r.rule_id, (perRuleToday.get(r.rule_id) ?? 0) + 1)
        }
        if (r.rule_id && Number.isFinite(ts) && ts >= hourStartMs) firedThisHour.add(r.rule_id)
        if (r.kind === 'wallet_activity') {
          const hashes = r.payload?.raw?.txHashes
          if (Array.isArray(hashes)) for (const h of hashes) if (typeof h === 'string') notifiedTxUser.add(h)
        } else if (Number.isFinite(ts) && ts >= recentCutoff && r.rule_id && r.title) {
          recentDupKeys.add(`${r.rule_id}|${r.title}`)
        }
      }
    } catch {
      usedToday = 0
    }

    // Wallet alerts dedup by transaction: only moves not already notified for
    // this rule go out, so a new $80M transfer is not hidden behind an earlier
    // $1M one (the title used to be identical every time). Other kinds keep
    // the (rule, title) window for re-surfaced price moves and headlines.
    const deduped: Candidate[] = []
    const claimed = new Set<string>() // one tx notifies once even if two followed addresses saw it
    for (const c of candidates) {
      // The hourly unique key would drop it anyway; skip before it takes a cap
      // slot or claims tx hashes the next hour should still pick up.
      if (firedThisHour.has(c.rule.id)) {
        result.capped += 1
        continue
      }
      if (c.rule.kind === 'wallet_activity') {
        if ((perRuleToday.get(c.rule.id) ?? 0) >= WALLET_RULE_DAILY_CAP) {
          result.capped += 1
          continue
        }
        const raw = (c.copy.payload?.raw ?? {}) as { txs?: WalletTx[] }
        const txs = Array.isArray(raw.txs) ? raw.txs : []
        const fresh = txs.filter((t) => !notifiedTxUser.has(t.h) && !claimed.has(t.h))
        if (fresh.length === 0) {
          result.capped += 1
          continue
        }
        for (const t of fresh) claimed.add(t.h)
        const addr = String(c.rule.address || '')
        const label = labels.get(addr.startsWith('0x') ? addr.toLowerCase() : addr) ?? null
        deduped.push({ rule: c.rule, copy: formatWalletActivityFromTxs(addr, c.rule.chain ?? null, fresh, label) })
      } else if (recentDupKeys.has(`${c.rule.id}|${c.copy.title}`)) {
        result.capped += 1
      } else {
        deduped.push(c)
      }
    }

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

  // 6. Telemetry (best-effort).
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
