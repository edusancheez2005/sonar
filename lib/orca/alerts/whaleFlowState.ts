/**
 * Edge-triggered whale_flow alerts (2026-10-25).
 *
 * The old evaluator fired on a 24h rolling LEVEL every run, so a rule set
 * below a token's normal daily net fired every hour and burned the user's
 * daily cap by 02:00 UTC (13,773 of 14,082 triggers capped in 7 days).
 *
 * Now a rule fires when |24h net| ≥ threshold AND it is armed; firing
 * disarms it; it re-arms when a later run sees |24h net| below half the
 * threshold, or 24 h after it last fired. State lives in app_cache under
 * `alert_state:<rule_id>` (no new table). The net is the shared whale
 * net-flow definition (lib/whale/netFlow.ts), so the alert figure is the
 * dashboard figure.
 */
export interface WhaleFlowState {
  lastLevel: number
  armed: boolean
  lastFiredAt: string | null
}

export const REARM_FRACTION = 0.5
export const REARM_AFTER_MS = 24 * 3_600_000
export const ALERT_STATE_PREFIX = 'alert_state:'

export function stepWhaleFlow(
  prev: WhaleFlowState | null | undefined,
  net: number,
  threshold: number,
  nowMs: number
): { fire: boolean; next: WhaleFlowState } {
  const level = Math.abs(Number(net) || 0)
  const limit = Number(threshold)
  const lastFiredAt = prev?.lastFiredAt ?? null
  if (!Number.isFinite(limit) || limit <= 0) return { fire: false, next: { lastLevel: net, armed: prev?.armed ?? true, lastFiredAt } }
  let armed = prev ? prev.armed !== false : true
  const firedMs = lastFiredAt ? Date.parse(lastFiredAt) : NaN
  if (!armed && (level < REARM_FRACTION * limit || (Number.isFinite(firedMs) && nowMs - firedMs >= REARM_AFTER_MS))) armed = true
  if (armed && level >= limit) {
    return { fire: true, next: { lastLevel: net, armed: false, lastFiredAt: new Date(nowMs).toISOString() } }
  }
  return { fire: false, next: { lastLevel: net, armed, lastFiredAt } }
}

type Client = { from: (table: string) => any }

/** States for the given rule ids (missing = fresh, armed). Never throws. */
export async function loadWhaleFlowStates(supabase: Client, ruleIds: string[]): Promise<Map<string, WhaleFlowState>> {
  const out = new Map<string, WhaleFlowState>()
  for (let i = 0; i < ruleIds.length; i += 100) {
    const keys = ruleIds.slice(i, i + 100).map((id) => `${ALERT_STATE_PREFIX}${id}`)
    try {
      const { data } = await supabase.from('app_cache').select('key, value').in('key', keys)
      for (const row of (Array.isArray(data) ? data : []) as Array<{ key?: string; value?: any }>) {
        const id = String(row?.key || '').slice(ALERT_STATE_PREFIX.length)
        const v = row?.value
        if (id && v && typeof v === 'object') out.set(id, { lastLevel: Number(v.lastLevel) || 0, armed: v.armed !== false, lastFiredAt: v.lastFiredAt ?? null })
      }
    } catch {
      /* missing state = armed */
    }
  }
  return out
}

/** Persist changed states in one upsert. Never throws. */
export async function saveWhaleFlowStates(supabase: Client, states: Array<{ ruleId: string; state: WhaleFlowState }>, nowIso: string): Promise<void> {
  if (!states.length) return
  try {
    await supabase.from('app_cache').upsert(
      states.map(({ ruleId, state }) => ({ key: `${ALERT_STATE_PREFIX}${ruleId}`, value: state, updated_at: nowIso })),
      { onConflict: 'key' }
    )
  } catch {
    /* a lost write re-fires at most once more */
  }
}
