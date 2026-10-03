/**
 * Server-side funnel writer. Fire-and-forget: never throws, never awaited on
 * the hot path (callers `void trackServer(...)`). Uses whichever service-role
 * client the caller already holds so routes do not open a new connection just
 * to log an event.
 */
import { isFunnelEvent, sanitiseProps } from './events'

export interface TrackInput {
  userId?: string | null
  event: string
  props?: Record<string, unknown> | null
  path?: string | null
}

type SupabaseLike = { from: (table: string) => any }

declare global {
  // eslint-disable-next-line no-var
  var __sonarFunnelWarned: boolean | undefined
}

export async function trackServer(
  supabase: SupabaseLike | null | undefined,
  { userId = null, event, props = {}, path = null }: TrackInput
): Promise<boolean> {
  try {
    if (!supabase || !isFunnelEvent(event)) return false
    const row = {
      user_id: userId || null,
      event,
      props: sanitiseProps(props),
      path: typeof path === 'string' ? path.slice(0, 200) : null,
    }
    const { error } = await supabase.from('funnel_events').insert(row)
    if (error) {
      // 42P01 = table missing (migration not run yet). Warn once per process.
      if (!globalThis.__sonarFunnelWarned) {
        globalThis.__sonarFunnelWarned = true
        console.warn('[funnel] insert failed:', error.code || '', error.message)
      }
      return false
    }
    return true
  } catch {
    return false
  }
}
