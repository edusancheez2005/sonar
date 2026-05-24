/**
 * Tool: getSocial
 * =============================================================================
 * Reads the most recent sentiment_scores row for a ticker. The
 * sentiment_scores table is populated by the existing sentiment pipeline
 * (see supabase/migrations/20260103_phase1_orca_tables.sql).
 */
import type { SupabaseLike, ToolResult } from '../types'

export interface GetSocialArgs {
  ticker?: unknown
}

export async function run(
  args: GetSocialArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return { ok: false, data: null, source: 'sentiment_scores', fetched_at, error: 'invalid_ticker' }
  }

  try {
    const { data } = await supabase
      .from('sentiment_scores')
      .select('*')
      .eq('ticker', ticker)
      .order('timestamp', { ascending: false })
      .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    if (!row) {
      return { ok: true, data: { ticker, score: null }, source: 'sentiment_scores', fetched_at }
    }
    return { ok: true, data: { ticker, ...row }, source: 'sentiment_scores', fetched_at }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'sentiment_scores',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}
