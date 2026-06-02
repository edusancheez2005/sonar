/**
 * loadRecentHistory — server-side chat lookback loader.
 * =============================================================================
 * Conversation Lookback Fix (2026-06-02).
 *
 * The chat clients do NOT send prior turns; the server is the single source of
 * truth. On every POST the route handler loads the last N turns from
 * `chat_history` (by session_id, or by user_id as a graceful fallback) and
 * injects them into the writer prompt so follow-ups like "what does that mean?"
 * resolve against the real prior turns instead of inventing a denial.
 *
 * Hard rules:
 *  - Never throws. Returns [] on any error (history is best-effort context).
 *  - Filters by the verified userId from the route handler's JWT, so a user
 *    can only ever see their OWN turns regardless of the session_id they claim.
 *  - Tolerates BOTH historical column shapes that exist in `chat_history`:
 *      * `question` / `response`        (fastWrites inserts)
 *      * `user_message` / `orca_response` (legacy ticker + Stage-A inserts)
 *    Reads with `select('*')` so a missing column never errors the query.
 *  - Orders chronologically (oldest → newest) using the `timestamp` column
 *    (the real ordering column on this table; `created_at` does not exist).
 */

export interface RecentTurn {
  role: 'user' | 'assistant'
  content: string
  /** ISO timestamp of the turn. Optional so plain {role,content} client
   *  ChatTurn[] arrays remain structurally assignable to RecentTurn[]. */
  created_at?: string
}

export interface SupabaseLike {
  from: (table: string) => any
}

const MAX_RAW_USER_CHARS = 4000
const MAX_RAW_ASSISTANT_CHARS = 8000

function cleanContent(v: unknown, cap: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  return s.length > cap ? s.slice(0, cap) : s
}

/**
 * Loads the last N turns for a chat conversation, ordered oldest → newest.
 * Looks up by session_id when provided; otherwise falls back to the user's
 * most recent N turns across all sessions.
 */
export async function loadRecentHistory(
  supabase: SupabaseLike,
  userId: string,
  sessionId: string | null,
  limit = 12
): Promise<RecentTurn[]> {
  if (!userId || typeof userId !== 'string') return []
  const n = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 12

  try {
    let q: any = supabase.from('chat_history').select('*').eq('user_id', userId)
    if (sessionId && typeof sessionId === 'string') {
      q = q.eq('session_id', sessionId)
    }
    if (typeof q.order === 'function') {
      q = q.order('timestamp', { ascending: false })
    }
    if (typeof q.limit === 'function') {
      // Each DB row yields up to two turns (user + assistant), so over-fetch a
      // little and slice after unifying.
      q = q.limit(n)
    }
    const { data, error } = await q
    if (error || !Array.isArray(data)) return []

    // Rows arrive newest → oldest; reverse to chronological.
    const rows = data.slice().reverse()
    const turns: RecentTurn[] = []
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const createdAt =
        (typeof (row as any).timestamp === 'string' && (row as any).timestamp) ||
        (typeof (row as any).created_at === 'string' && (row as any).created_at) ||
        ''
      const userContent =
        cleanContent((row as any).question, MAX_RAW_USER_CHARS) ??
        cleanContent((row as any).user_message, MAX_RAW_USER_CHARS)
      const assistantContent =
        cleanContent((row as any).response, MAX_RAW_ASSISTANT_CHARS) ??
        cleanContent((row as any).orca_response, MAX_RAW_ASSISTANT_CHARS)
      if (userContent) turns.push({ role: 'user', content: userContent, created_at: createdAt })
      if (assistantContent) turns.push({ role: 'assistant', content: assistantContent, created_at: createdAt })
    }

    // Keep at most the last 2*N turns (N pairs).
    const sliced = turns.slice(-2 * n)

    if (sliced.length > 0 && process.env.NODE_ENV !== 'production') {
      console.log(
        `[chat/history] loaded N=${sliced.length} session=${sessionId ?? 'null'} for user=${userId}`
      )
    }

    return sliced
  } catch (err) {
    console.warn('[chat/history] load failed', err)
    return []
  }
}
