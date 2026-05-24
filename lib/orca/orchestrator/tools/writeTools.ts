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
    return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: 'invalid_args' }
  }
  try {
    const { error } = await supabase
      .from('user_watchlist')
      .upsert({ user_id: userId, ticker }, { onConflict: 'user_id,ticker' })
    if (error) {
      return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, added: true }, source: 'user_watchlist', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: err?.message ?? 'write_failed' }
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
    return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: 'invalid_args' }
  }
  try {
    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', ticker)
    if (error) {
      return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: String(error?.message || 'write_failed') }
    }
    return { ok: true, data: { ticker, removed: true }, source: 'user_watchlist', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_watchlist', fetched_at, error: err?.message ?? 'write_failed' }
  }
}

/**
 * setUserAlert is a placeholder for the alerts table that will land with
 * §4.F. Returns a sentinel ToolResult so the writer can acknowledge the
 * user's confirmation without crashing.
 */
export async function runSetUserAlert(
  _args: unknown,
  _supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  return {
    ok: false,
    data: null,
    source: 'user_alerts',
    fetched_at: now().toISOString(),
    error: 'alerts_not_yet_implemented',
  }
}
