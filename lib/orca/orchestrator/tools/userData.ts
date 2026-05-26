/**
 * Tool: getUserHoldings, getUserWatchlist, getOrcaMemory
 * =============================================================================
 * User-scoped reads from the tables added in step 4.B. Each function
 * returns a ToolResult shaped exactly like the market-data tools so the
 * writer can format them uniformly.
 *
 * IMPORTANT: these helpers trust that the caller has already verified the
 * user JWT and is passing the authenticated user's id. They MUST NOT be
 * exposed in any client-reachable form.
 */
import type { SupabaseLike, ToolResult } from '../types'

interface UserArgs {
  userId?: unknown
}

function cleanUserId(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 8 || s.length > 128) return null
  return s
}

export async function runGetUserHoldings(
  args: UserArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  if (!userId) {
    return { ok: false, data: null, source: 'user_holdings', fetched_at, error: 'invalid_user' }
  }
  try {
    const { data } = await supabase
      .from('user_holdings')
      .select('ticker, approx_usd_value, blockchain')
      .eq('user_id', userId)
    return {
      ok: true,
      data: {
        holdings: (Array.isArray(data) ? data : []).map((r: any) => ({
          ticker: String(r?.ticker ?? '').toUpperCase(),
          bucket: r?.approx_usd_value ?? null,
          blockchain: r?.blockchain ?? null,
        })),
      },
      source: 'user_holdings',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'user_holdings',
      fetched_at,
      error: err?.message ?? 'query_failed',
    }
  }
}

export async function runGetUserWatchlist(
  args: UserArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  if (!userId) {
    return { ok: false, data: null, source: 'user_watchlists', fetched_at, error: 'invalid_user' }
  }
  try {
    // STAGE B.1 (2026-05-26): read from canonical `user_watchlists` table
    // (plural, column `symbol`). Token-page additions land here; the old
    // `user_watchlist` (singular, column `ticker`) is now orphaned legacy.
    const { data } = await supabase
      .from('user_watchlists')
      .select('symbol')
      .eq('user_id', userId)
    return {
      ok: true,
      data: {
        tickers: (Array.isArray(data) ? data : [])
          .map((r: any) => String(r?.symbol ?? '').toUpperCase())
          .filter(Boolean),
      },
      source: 'user_watchlists',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'user_watchlists',
      fetched_at,
      error: err?.message ?? 'query_failed',
    }
  }
}

export async function runGetOrcaMemory(
  args: UserArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const userId = cleanUserId(args.userId)
  if (!userId) {
    return { ok: false, data: null, source: 'orca_memory', fetched_at, error: 'invalid_user' }
  }
  const nowIso = now().toISOString()
  try {
    const { data } = await supabase
      .from('orca_memory')
      .select('fact, category, created_at, expires_at')
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(50)
    return {
      ok: true,
      data: {
        facts: (Array.isArray(data) ? data : []).map((r: any) => ({
          fact: typeof r?.fact === 'string' ? r.fact : '',
          category: r?.category ?? null,
          created_at: r?.created_at ?? null,
          expires_at: r?.expires_at ?? null,
        })),
      },
      source: 'orca_memory',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'orca_memory',
      fetched_at,
      error: err?.message ?? 'query_failed',
    }
  }
}
