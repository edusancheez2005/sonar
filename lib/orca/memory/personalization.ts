/**
 * ORCA personalisation context loader + system-prompt block builder.
 * =============================================================================
 * Stage E (2026-05-26). Surfaces a short, neutral personalisation block that
 * the v1 chat path prepends to ORCA_SYSTEM_PROMPT before each turn. Two
 * sources combine:
 *
 *   1. `user_profile`  — onboarding answers (experience, goal, risk, time
 *                        horizon, preferred chains).
 *   2. `orca_memory`   — durable facts the extractor learned from prior
 *                        conversations (paraphrased, PII-scrubbed; see
 *                        lib/orca/memory/extractor.ts).
 *
 * Design rules (locked, do not relax without re-review):
 *   - The block is ADDITIVE context only. It MUST NOT relax any of the
 *     ORCA_SYSTEM_PROMPT hard rules (no buy/sell/price-target verbs).
 *   - It is short — capped at 8 memory facts, single block of prose.
 *   - All errors swallowed: returns `null`/empty rather than throwing, so a
 *     personalisation failure can never break the chat reply.
 *   - The helper has zero dependency on any specific Supabase client type —
 *     it accepts a minimal `from(table).select().eq()` shape and tolerates
 *     missing fields. This keeps it test-friendly and reusable across the
 *     v1 SSE path, the conversational fallback, and the v2 orchestrator.
 */

export interface UserProfileLite {
  experience_level?: string | null
  primary_goal?: string | null
  risk_tolerance?: string | null
  time_horizon?: string | null
  preferred_chains?: string[] | null
}

export interface MemoryFact {
  fact: string
  confidence?: number | null
  created_at?: string | null
  expires_at?: string | null
}

export interface PersonalizationContext {
  profile: UserProfileLite | null
  memories: MemoryFact[]
  tickers: string[]
  mutedTickers: string[]
}

const MAX_MEMORY_FACTS = 8
const MAX_FACT_LEN_INLINE = 200

// Minimal supabase-like shape. We deliberately do NOT import the real client
// type to keep this helper unit-testable with a plain mock.
type SbLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: any) => any
    }
  }
}

/**
 * Load the user's profile row + most-recent non-expired memory facts.
 * Never throws. Missing tables / RLS denial → empty context.
 */
export async function loadPersonalizationContext(
  supabase: SbLike,
  userId: string,
  now: () => Date = () => new Date()
): Promise<PersonalizationContext> {
  const empty: PersonalizationContext = { profile: null, memories: [], tickers: [], mutedTickers: [] }
  if (!userId || typeof userId !== 'string') return empty

  let profile: UserProfileLite | null = null
  const mutedTickers: string[] = []
  try {
    const q = supabase
      .from('user_profile')
      .select('experience_level, primary_goal, risk_tolerance, time_horizon, preferred_chains, muted_tickers, muted_tickers_until')
      .eq('user_id', userId)
    const { data } = await (typeof (q as any).maybeSingle === 'function'
      ? (q as any).maybeSingle()
      : (q as any).single().catch(() => ({ data: null })))
    if (data && typeof data === 'object') {
      profile = data as UserProfileLite
      // Active mutes: only when the shared expiry is in the future.
      const until = (data as any).muted_tickers_until
      const arr = (data as any).muted_tickers
      if (Array.isArray(arr) && arr.length > 0 && until) {
        const untilMs = new Date(until).getTime()
        if (!isNaN(untilMs) && untilMs > now().getTime()) {
          for (const t of arr) {
            const norm = typeof t === 'string' ? t.trim().toUpperCase() : ''
            if (norm && !mutedTickers.includes(norm)) mutedTickers.push(norm)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[orca/personalization] profile load failed', err)
  }

  let memories: MemoryFact[] = []
  try {
    const nowIso = now().toISOString()
    let q: any = supabase
      .from('orca_memory')
      .select('fact, confidence, created_at, expires_at')
      .eq('user_id', userId)
    if (typeof q.or === 'function') {
      q = q.or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    }
    if (typeof q.order === 'function') {
      q = q.order('created_at', { ascending: false })
    }
    if (typeof q.limit === 'function') {
      q = q.limit(MAX_MEMORY_FACTS)
    }
    const { data } = await q
    if (Array.isArray(data)) {
      memories = data
        .filter((r: any) => r && typeof r.fact === 'string' && r.fact.trim().length > 0)
        .slice(0, MAX_MEMORY_FACTS)
        .map((r: any) => ({
          fact: String(r.fact).slice(0, MAX_FACT_LEN_INLINE),
          confidence: typeof r.confidence === 'number' ? r.confidence : null,
          created_at: r.created_at ?? null,
          expires_at: r.expires_at ?? null,
        }))
    }
  } catch (err) {
    console.warn('[orca/personalization] memory load failed', err)
  }

  // Watchlist + holdings tickers. Same canonical sources as the personal
  // Watchlist tab (lib/personal/watchlist.ts) so the writer model sees what
  // the user sees on /dashboard/personal. We deliberately use a plain query
  // (not a helper import) to keep this file dependency-free.
  const tickers: string[] = []
  try {
    const seen = new Set<string>()
    const norm = (raw: any): string | null => {
      if (!raw) return null
      const t = String(raw).trim().toUpperCase()
      if (!t || t.length > 12) return null
      if (!/^[A-Z0-9._-]+$/.test(t)) return null
      return t
    }
    // user_holdings.ticker
    try {
      const { data } = await (supabase as any)
        .from('user_holdings').select('ticker').eq('user_id', userId)
      if (Array.isArray(data)) {
        for (const r of data) {
          const t = norm(r?.ticker)
          if (t && !seen.has(t)) { seen.add(t); tickers.push(t) }
        }
      }
    } catch { /* ignore */ }
    // user_watchlists.symbol (canonical, Stage B.1)
    try {
      const { data } = await (supabase as any)
        .from('user_watchlists').select('symbol').eq('user_id', userId)
      if (Array.isArray(data)) {
        for (const r of data) {
          const t = norm(r?.symbol)
          if (t && !seen.has(t)) { seen.add(t); tickers.push(t) }
        }
      }
    } catch { /* ignore */ }
  } catch (err) {
    console.warn('[orca/personalization] tickers load failed', err)
  }

  return { profile, memories, tickers, mutedTickers }
}

/**
 * Load short human-readable summaries of the user's active alert rules
 * (e.g. "SOL price move", "BTC whale flow"). Used to add one line to the
 * personalisation block so ORCA can answer "what am I being alerted on?".
 * Never throws — missing table / RLS denial → empty array.
 */
export async function loadActiveAlertSummaries(
  supabase: any,
  userId: string
): Promise<string[]> {
  if (!userId || typeof userId !== 'string') return []
  const KIND_LABEL: Record<string, string> = {
    price_move: 'price move',
    whale_flow: 'whale flow',
    signal_flip: 'signal change',
    news_high_impact: 'high-impact news',
  }
  try {
    const { data } = await supabase
      .from('user_alerts')
      .select('ticker, kind')
      .eq('user_id', userId)
      .eq('enabled', true)
    if (!Array.isArray(data)) return []
    return data
      .map((r: any) => {
        const t = r && typeof r.ticker === 'string' ? r.ticker.trim().toUpperCase() : ''
        const k = r && typeof r.kind === 'string' ? KIND_LABEL[r.kind] : ''
        return t && k ? `${t} ${k}` : ''
      })
      .filter((s: string) => s.length > 0)
      .slice(0, 25)
  } catch (err) {
    console.warn('[orca/personalization] alerts load failed', err)
    return []
  }
}

const EXPERIENCE_LABEL: Record<string, string> = {
  new: 'a beginner — define jargon on first use',
  intermediate: 'an intermediate crypto user — assume familiarity with common DeFi/onchain terms',
  advanced: 'an advanced crypto user — skip basic definitions, lead with the data',
}

const HORIZON_LABEL: Record<string, string> = {
  intraday: 'an intraday horizon (lead with 1h and 24h windows)',
  swing: 'a multi-day swing horizon (lead with 24h and 7d windows)',
  position: 'a multi-week position horizon (lead with 7d and 30d windows)',
  long_term: 'a long-term horizon (lead with 30d and macro context)',
}

const RISK_LABEL: Record<string, string> = {
  conservative: 'a conservative risk posture — flag volatility and drawdowns prominently',
  balanced: 'a balanced risk posture',
  aggressive: 'an aggressive risk posture — they have asked for blunt, dense data, no softening',
}

const GOAL_LABEL: Record<string, string> = {
  learn: 'is here to learn — favour explanations',
  track: 'is here to track positions and the broader market',
  research: 'is here to do research — be exhaustive with sources and numbers',
  trade: 'is here to follow live market structure',
}

function describeProfile(profile: UserProfileLite | null): string | null {
  if (!profile) return null
  const lines: string[] = []
  if (profile.experience_level && EXPERIENCE_LABEL[profile.experience_level]) {
    lines.push(`Calibrate to ${EXPERIENCE_LABEL[profile.experience_level]}.`)
  }
  if (profile.time_horizon && HORIZON_LABEL[profile.time_horizon]) {
    lines.push(`User trades on ${HORIZON_LABEL[profile.time_horizon]}.`)
  }
  if (profile.risk_tolerance && RISK_LABEL[profile.risk_tolerance]) {
    lines.push(`User has ${RISK_LABEL[profile.risk_tolerance]}.`)
  }
  if (profile.primary_goal && GOAL_LABEL[profile.primary_goal]) {
    lines.push(`User ${GOAL_LABEL[profile.primary_goal]}.`)
  }
  if (Array.isArray(profile.preferred_chains) && profile.preferred_chains.length > 0) {
    const chains = profile.preferred_chains
      .filter((c) => typeof c === 'string' && c.trim().length > 0)
      .slice(0, 6)
    if (chains.length > 0) {
      lines.push(`Preferred chains: ${chains.join(', ')}.`)
    }
  }
  return lines.length > 0 ? lines.join(' ') : null
}

/**
 * Build the personalisation block prepended to ORCA_SYSTEM_PROMPT. Returns
 * an empty string when there is nothing useful to add. The block is wrapped
 * with explicit guard rails reminding the model not to violate the existing
 * ORCA hard rules (no buy/sell, no price targets) even when personalising.
 */
export function buildPersonalizationBlock(
  profile: UserProfileLite | null,
  memories: MemoryFact[],
  tickers: string[] = [],
  alertSummaries: string[] = [],
  mutedTickers: string[] = []
): string {
  const profileLine = describeProfile(profile)
  const factLines = (memories || [])
    .map((m) => (m && typeof m.fact === 'string' ? m.fact.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, MAX_MEMORY_FACTS)
  const cleanTickers = Array.from(
    new Set((tickers || [])
      .map((t) => (typeof t === 'string' ? t.trim().toUpperCase() : ''))
      .filter((t) => t.length > 0 && t.length <= 12)
    )
  ).slice(0, 25)
  const cleanAlerts = (alertSummaries || [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 25)
  const cleanMuted = Array.from(
    new Set((mutedTickers || [])
      .map((t) => (typeof t === 'string' ? t.trim().toUpperCase() : ''))
      .filter((t) => t.length > 0 && t.length <= 12)
    )
  ).slice(0, 50)

  if (!profileLine && factLines.length === 0 && cleanTickers.length === 0 && cleanAlerts.length === 0 && cleanMuted.length === 0) return ''

  const parts: string[] = []
  parts.push('## USER PERSONALISATION (additive context — do NOT relax the HARD RULES below)')
  if (profileLine) {
    parts.push(profileLine)
  }
  if (cleanTickers.length > 0) {
    parts.push(
      `User's current watchlist + holdings (canonical, ${cleanTickers.length} tickers): ${cleanTickers.join(', ')}. ` +
      `When the user asks "my watchlist", "my positions", "my tickers", or similar, treat THIS list as authoritative — do NOT say the watchlist is empty or unavailable.`
    )
  }
  if (factLines.length > 0) {
    parts.push('Durable facts ORCA has learned from prior conversations with this user (paraphrased, PII-scrubbed):')
    for (const f of factLines) {
      parts.push(`- ${f.slice(0, MAX_FACT_LEN_INLINE)}`)
    }
  }
  if (cleanAlerts.length > 0) {
    parts.push(
      `User's active ORCA alerts (${cleanAlerts.length}): ${cleanAlerts.join(', ')}. ` +
      `If the user asks about "my alerts" or whether they are being notified about a token, treat THIS list as authoritative.`
    )
  }
  if (cleanMuted.length > 0) {
    parts.push(
      `User has temporarily muted alerts for: ${cleanMuted.join(', ')}. ` +
      `Do NOT suggest enabling alerts for these tickers in this turn.`
    )
  }
  parts.push(
    'Use this context to calibrate tone, time-horizon emphasis, and chain coverage only. It does not unlock any directional verbs, target prices, or forecasts — the ROLE, HARD RULES, WHAT YOU CAN DO, and RESPONSE FORMAT sections below take absolute precedence.'
  )

  return parts.join('\n\n')
}

export const __internals = {
  MAX_MEMORY_FACTS,
  MAX_FACT_LEN_INLINE,
  EXPERIENCE_LABEL,
  HORIZON_LABEL,
  RISK_LABEL,
  GOAL_LABEL,
  describeProfile,
}
