/**
 * humanRelative — format a future/past timestamp as a short human phrase.
 * =============================================================================
 * Voice writes — muteTicker (2026-06-02). Pure JS, no date-fns.
 *
 * Examples (relative to `now`):
 *   +24h  → "in 24 hours"
 *   +3d   → "in 3 days"
 *   +1w   → "in 1 week"
 *   +90m  → "in 90 minutes"
 *   past  → "in the past"
 *   null  → "indefinitely"
 */

export function humanRelative(until: string | Date | null | undefined, now: () => Date = () => new Date()): string {
  if (until === null || until === undefined) return 'indefinitely'
  const target = until instanceof Date ? until : new Date(until)
  if (isNaN(target.getTime())) return 'indefinitely'

  const deltaMs = target.getTime() - now().getTime()
  if (deltaMs <= 0) return 'in the past'

  const minutes = Math.round(deltaMs / 60000)
  if (minutes < 60) {
    return `in ${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 48) {
    return `in ${hours} hour${hours === 1 ? '' : 's'}`
  }
  const days = Math.round(hours / 24)
  if (days < 14) {
    return `in ${days} day${days === 1 ? '' : 's'}`
  }
  const weeks = Math.round(days / 7)
  return `in ${weeks} week${weeks === 1 ? '' : 's'}`
}
