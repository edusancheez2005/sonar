/**
 * Tool: getSignalContext (W3)
 * =============================================================================
 * Returns the most recent signals for a ticker from `token_signals`, plus
 * the last verdict and a "suspect" flag if the signal flipped > 2 times
 * in the supplied window (default: 24h).
 *
 * Output is purely descriptive of historical engine output. The renderer
 * MUST frame it as a description of what the engine emitted, never as a
 * recommendation.
 */
import type { SupabaseLike, ToolResult } from '../types'

const DEFAULT_WINDOW_HOURS = 24
const ROW_LIMIT = 50
const SUSPECT_FLIP_THRESHOLD = 2

export interface GetSignalContextArgs {
  ticker?: unknown
  /** Optional ISO timestamp; defaults to now - 24h. */
  since?: unknown
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}

function normaliseSince(v: unknown, now: Date): string {
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return new Date(
    now.getTime() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()
}

export async function run(
  args: GetSignalContextArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return {
      ok: false,
      data: null,
      source: 'token_signals',
      fetched_at,
      error: 'invalid_ticker',
    }
  }
  const sinceIso = normaliseSince(args.since, now())
  try {
    const { data } = await supabase
      .from('token_signals')
      .select('signal, score, confidence, computed_at, timeframe')
      .eq('token', ticker)
      .gte('computed_at', sinceIso)
      .order('computed_at', { ascending: false })
      .limit(ROW_LIMIT)

    const rows = Array.isArray(data) ? data : []
    const recent = rows.map((r: any) => ({
      signal: typeof r?.signal === 'string' ? r.signal : null,
      score: typeof r?.score === 'number' ? r.score : null,
      confidence: typeof r?.confidence === 'number' ? r.confidence : null,
      computed_at: r?.computed_at ?? null,
      timeframe: r?.timeframe ?? null,
    }))

    let flips = 0
    for (let i = 1; i < recent.length; i++) {
      if (recent[i - 1].signal && recent[i].signal && recent[i - 1].signal !== recent[i].signal) {
        flips += 1
      }
    }
    const last = recent[0] ?? null

    return {
      ok: true,
      data: {
        ticker,
        window_start: sinceIso,
        sample_count: recent.length,
        last_verdict: last,
        flip_count: flips,
        suspect: flips > SUSPECT_FLIP_THRESHOLD,
        recent_signals: recent.slice(0, 10),
      },
      source: 'token_signals',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'token_signals',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}
