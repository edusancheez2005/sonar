/**
 * Tool: write-tools (addToWatchlist, removeFromWatchlist, setUserAlert)
 * =============================================================================
 * These mutate user data. They MUST NOT be called unless the route handler
 * has verified an explicit user-confirmation event AND `isWriteTool` is
 * checked by the planner first. The orchestrator runner does not invoke
 * them automatically — the chat route handler does, when it sees a
 * `confirmation` field in the request body.
 *
 * Kept here for symmetry with the read tools and so tests can exercise
 * the contract.
 *
 * STAGE B.1 unification (2026-05-26): writes go to the canonical
 * `user_watchlists` table (plural, column `symbol`) so ORCA-added entries
 * appear in the same place as token-page "+ Watchlist" additions and the
 * personal Watchlist tab. Public function signatures still accept
 * `ticker` for back-compat with callers.
 */
import type { SupabaseLike, ToolResult } from '../types'

function cleanTicker(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}

function cleanUserId(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 8 || s.length > 128) return null
  return s
}

export async function runAddToWatchlist(
  args: { userId?: unknown; ticker?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  if (!userId || !ticker) {
    return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: 'invalid_args' }
  }
  try {
    const { error } = await supabase
      .from('user_watchlists')
      .upsert({ user_id: userId, symbol: ticker }, { onConflict: 'user_id,symbol' })
    if (error) {
      return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, added: true }, source: 'user_watchlists', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runRemoveFromWatchlist(
  args: { userId?: unknown; ticker?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  if (!userId || !ticker) {
    return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: 'invalid_args' }
  }
  try {
    const { error } = await supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', ticker)
    if (error) {
      return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, removed: true }, source: 'user_watchlists', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

/**
 * Alert write-tools (Proactive Alerts stage, 2026-06-03)
 * =============================================================================
 * createAlert / removeAlert / listAlerts operate on the canonical
 * `user_alerts` table. They mirror the REST API in app/api/personal/alerts so
 * the chat confirm-trip and the dashboard form converge on identical rows.
 *
 * The active-rule cap (MAX_ACTIVE_RULES_PER_USER = 50) is enforced here too,
 * since the chat path does not go through the REST handler.
 */
const ALERT_KINDS = ['price_move', 'whale_flow', 'signal_flip', 'news_high_impact'] as const
type AlertKind = (typeof ALERT_KINDS)[number]
const MAX_ACTIVE_RULES_PER_USER = 50

function cleanKind(v: unknown): AlertKind | null {
  return typeof v === 'string' && (ALERT_KINDS as readonly string[]).includes(v) ? (v as AlertKind) : null
}

export async function runCreateAlert(
  args: { userId?: unknown; ticker?: unknown; kind?: unknown; threshold_pct?: unknown; threshold_usd?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  const kind = cleanKind(args.kind)
  if (!userId || !ticker || !kind) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'invalid_args' }
  }

  let threshold_pct: number | null = null
  let threshold_usd: number | null = null
  if (kind === 'price_move') {
    const pct = Number(args.threshold_pct)
    threshold_pct = Number.isFinite(pct) && pct > 0 ? pct : 5
  } else if (kind === 'whale_flow') {
    const usd = Number(args.threshold_usd)
    threshold_usd = Number.isFinite(usd) && usd > 0 ? Math.round(usd) : 1_000_000
  }

  try {
    const { data: existing, error: countErr } = await supabase
      .from('user_alerts')
      .select('id, ticker, kind, enabled')
      .eq('user_id', userId)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    if (countErr) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(countErr?.message || 'write_failed') }
    }
    const rows = (existing ?? []) as Array<{ ticker: string; kind: string; enabled: boolean }>
    const alreadyExists = rows.some((r) => r.ticker === ticker && r.kind === kind)
    const activeCount = rows.filter((r) => r.enabled).length
    if (!alreadyExists && activeCount >= MAX_ACTIVE_RULES_PER_USER) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'rule_limit_reached' }
    }

    const { error } = await supabase
      .from('user_alerts')
      .upsert(
        { user_id: userId, ticker, kind, threshold_pct, threshold_usd, enabled: true, updated_at: fetched_at },
        { onConflict: 'user_id,ticker,kind' }
      )
    if (error) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, kind, threshold_pct, threshold_usd, created: true }, source: 'user_alerts', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runRemoveAlert(
  args: { userId?: unknown; ticker?: unknown; kind?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  if (!userId || !ticker) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'invalid_args' }
  }
  const kind = cleanKind(args.kind)
  try {
    let q = supabase.from('user_alerts').delete().eq('user_id', userId).eq('ticker', ticker)
    if (kind) q = q.eq('kind', kind)
    const { error } = await q
    if (error) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, kind: kind ?? null, removed: true }, source: 'user_alerts', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runListAlerts(
  args: { userId?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  if (!userId) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'invalid_args' }
  }
  try {
    const { data, error } = await supabase
      .from('user_alerts')
      .select('id, ticker, kind, threshold_pct, threshold_usd, enabled')
      .eq('user_id', userId)
      .eq('enabled', true)
      .limit(MAX_ACTIVE_RULES_PER_USER + 10)
    if (error) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(error?.message || 'read_failed') }
    }
    return { ok: true, data: { rules: data ?? [] }, source: 'user_alerts', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: err?.message ?? 'read_failed' }
  }
}

/**
 * Back-compat shim for the orchestrator registry's 'setUserAlert' tool name.
 * Now backed by the real user_alerts table via runCreateAlert.
 */
export async function runSetUserAlert(
  args: unknown,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  return runCreateAlert((args ?? {}) as Parameters<typeof runCreateAlert>[0], supabase, now)
}

/**
 * Wallet & mute write-tools (Voice Writes stage, 2026-06-04)
 * =============================================================================
 * trackWallet / untrackWallet operate on `user_wallets`
 * (UNIQUE(user_id, address, chain), CHECK on chain). muteTicker / unmuteTicker
 * operate on the new `user_profile.muted_tickers text[]` +
 * `muted_tickers_until timestamptz` columns. Every runner is try/catch and
 * never throws — the route handler maps the ToolResult to human copy.
 */
const WALLET_CHAINS = ['eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp'] as const
const MAX_WALLETS_PER_USER = 100
const MAX_MUTED_TICKERS = 50

function cleanChain(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const c = v.trim().toLowerCase()
  return (WALLET_CHAINS as readonly string[]).includes(c) ? c : null
}

function cleanAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const a = v.trim()
  if (a.length < 4 || a.length > 128) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(a)) return null
  return a
}

function cleanMinutes(v: unknown): number {
  let m = Math.round(Number(v))
  if (!Number.isFinite(m) || m <= 0) m = 24 * 60
  const MIN = 5
  const MAX = 30 * 24 * 60
  if (m < MIN) m = MIN
  if (m > MAX) m = MAX
  return m
}

export async function runTrackWallet(
  args: { userId?: unknown; address?: unknown; chain?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const address = cleanAddress(args.address)
  const chain = cleanChain(args.chain)
  if (!userId || !address || !chain) {
    return { ok: false, data: null, source: 'user_wallets', fetched_at, error: 'invalid_args' }
  }
  try {
    const { data: existing, error: countErr } = await supabase
      .from('user_wallets')
      .select('address, chain')
      .eq('user_id', userId)
      .limit(MAX_WALLETS_PER_USER + 50)
    if (countErr) {
      return { ok: false, data: null, source: 'user_wallets', fetched_at, error: String(countErr?.message || 'write_failed') }
    }
    const rows = (existing ?? []) as Array<{ address: string; chain: string }>
    const already = rows.some((r) => r.address === address && r.chain === chain)
    if (!already && rows.length >= MAX_WALLETS_PER_USER) {
      return { ok: false, data: { wallet_cap_reached: true }, source: 'user_wallets', fetched_at, error: 'wallet_cap_reached' }
    }
    const { error } = await supabase
      .from('user_wallets')
      .upsert({ user_id: userId, address, chain }, { onConflict: 'user_id,address,chain' })
    if (error) {
      return { ok: false, data: null, source: 'user_wallets', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { address, chain, tracked: true }, source: 'user_wallets', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_wallets', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runUntrackWallet(
  args: { userId?: unknown; address?: unknown; chain?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const address = cleanAddress(args.address)
  const chain = cleanChain(args.chain)
  if (!userId || !address || !chain) {
    return { ok: false, data: null, source: 'user_wallets', fetched_at, error: 'invalid_args' }
  }
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .delete()
      .eq('user_id', userId)
      .eq('address', address)
      .eq('chain', chain)
      .select('id')
    if (error) {
      return { ok: false, data: null, source: 'user_wallets', fetched_at, error: String(error?.message || 'write_failed') }
    }
    const removed = Array.isArray(data) && data.length > 0
    if (!removed) {
      return { ok: true, data: { address, chain, removed: false, reason: 'not_tracked' }, source: 'user_wallets', fetched_at }
    }
    return { ok: true, data: { address, chain, removed: true }, source: 'user_wallets', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_wallets', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runMuteTicker(
  args: { userId?: unknown; ticker?: unknown; minutes?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  if (!userId || !ticker) {
    return { ok: false, data: null, source: 'user_profile', fetched_at, error: 'invalid_args' }
  }
  const minutes = cleanMinutes(args.minutes)
  const nowMs = now().getTime()
  const candidateUntil = new Date(nowMs + minutes * 60_000)
  try {
    const { data: profile, error: loadErr } = await supabase
      .from('user_profile')
      .select('muted_tickers, muted_tickers_until')
      .eq('user_id', userId)
      .maybeSingle()
    if (loadErr) {
      return { ok: false, data: null, source: 'user_profile', fetched_at, error: String(loadErr?.message || 'write_failed') }
    }
    const current: string[] = Array.isArray(profile?.muted_tickers) ? profile!.muted_tickers : []
    const set = new Set(current.map((t) => String(t).toUpperCase()))
    const already = set.has(ticker)
    if (!already && set.size >= MAX_MUTED_TICKERS) {
      return { ok: false, data: { mute_cap_reached: true }, source: 'user_profile', fetched_at, error: 'mute_cap_reached' }
    }
    set.add(ticker)
    // Later-of the existing expiry and the new one (single column for all).
    const existingUntil = profile?.muted_tickers_until ? new Date(profile.muted_tickers_until) : null
    const until =
      existingUntil && !isNaN(existingUntil.getTime()) && existingUntil.getTime() > candidateUntil.getTime()
        ? existingUntil
        : candidateUntil
    const until_iso = until.toISOString()
    const { error } = await supabase
      .from('user_profile')
      .upsert(
        { user_id: userId, muted_tickers: Array.from(set), muted_tickers_until: until_iso },
        { onConflict: 'user_id' }
      )
    if (error) {
      return { ok: false, data: null, source: 'user_profile', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, until_iso, muted: true }, source: 'user_profile', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_profile', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

export async function runUnmuteTicker(
  args: { userId?: unknown; ticker?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  const ticker = cleanTicker(args.ticker)
  if (!userId || !ticker) {
    return { ok: false, data: null, source: 'user_profile', fetched_at, error: 'invalid_args' }
  }
  try {
    const { data: profile, error: loadErr } = await supabase
      .from('user_profile')
      .select('muted_tickers, muted_tickers_until')
      .eq('user_id', userId)
      .maybeSingle()
    if (loadErr) {
      return { ok: false, data: null, source: 'user_profile', fetched_at, error: String(loadErr?.message || 'write_failed') }
    }
    const current: string[] = Array.isArray(profile?.muted_tickers) ? profile!.muted_tickers : []
    const set = new Set(current.map((t) => String(t).toUpperCase()))
    if (!set.has(ticker)) {
      return { ok: true, data: { ticker, unmuted: false, reason: 'not_muted' }, source: 'user_profile', fetched_at }
    }
    set.delete(ticker)
    const next = Array.from(set)
    const patch: Record<string, unknown> = { user_id: userId, muted_tickers: next }
    // Clear the shared expiry when nothing is muted anymore.
    if (next.length === 0) patch.muted_tickers_until = null
    const { error } = await supabase
      .from('user_profile')
      .upsert(patch, { onConflict: 'user_id' })
    if (error) {
      return { ok: false, data: null, source: 'user_profile', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, unmuted: true }, source: 'user_profile', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_profile', fetched_at, error: err?.message ?? 'write_failed' }
  }
}
