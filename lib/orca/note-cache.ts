/**
 * Per-ticker research-note cache (2026-09-30 latency pass).
 * =============================================================================
 * The v1 long-form note ("tell me about SOL") costs a 15-25s data fan-out plus
 * a 20-40s flagship write — 56s end to end, hitting the platform budget. The
 * note for a given ticker barely changes within a few minutes, so the route
 * stores each finished note (text + the `data` card payload) in app_cache and
 * serves it for the next 10 minutes: repeat asks stream in ~1s. Follow-ups,
 * trimmed/salvaged notes and personal questions are never cached.
 * Kill switch: ORCA_NOTE_CACHE=false.
 */
export const NOTE_CACHE_MAX_AGE_MS = 10 * 60 * 1000

export interface CachedNote {
  text: string
  data: unknown
  generated_at: string
}

export function noteCacheKey(ticker: string): string {
  return `orca_note:${String(ticker || '').toUpperCase()}`
}

export async function readCachedNote(supabase: any, key: string): Promise<CachedNote | null> {
  try {
    const { data } = await supabase.from('app_cache').select('value, updated_at').eq('key', key).maybeSingle()
    const v = data?.value as CachedNote | undefined
    if (!v?.text || typeof v.text !== 'string') return null
    const age = Date.now() - Date.parse(v.generated_at || data?.updated_at || 0)
    if (!Number.isFinite(age) || age > NOTE_CACHE_MAX_AGE_MS) return null
    return v
  } catch {
    return null
  }
}

export async function writeCachedNote(supabase: any, key: string, note: CachedNote): Promise<void> {
  try {
    await supabase.from('app_cache').upsert({ key, value: note, updated_at: note.generated_at }, { onConflict: 'key' })
  } catch (e) {
    console.warn('[note-cache] write failed', (e as Error)?.message || e)
  }
}

/** A note worth caching: complete, not the trimmed/salvaged/apology variants. */
export function isCacheableNote(text: string): boolean {
  return typeof text === 'string' && text.length > 1500 && !/Note trimmed to fit|unable to generate a response/i.test(text)
}
