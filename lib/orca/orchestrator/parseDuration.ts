/**
 * parseDuration — parse a human duration phrase into minutes.
 * =============================================================================
 * Voice writes — muteTicker (2026-06-02). Pure, dependency-free.
 *
 * Accepts: "24h", "3d", "1w", "15 hours", "3 days", "1 week", "30m".
 * Caps at 30 days (avoids silent-forever mutes). Default when omitted: 24h.
 */

const DEFAULT_MINUTES = 24 * 60
const MIN_MINUTES = 5
const MAX_MINUTES = 30 * 24 * 60

const UNIT_MINUTES: Record<string, number> = {
  m: 1,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  d: 24 * 60,
  day: 24 * 60,
  days: 24 * 60,
  w: 7 * 24 * 60,
  wk: 7 * 24 * 60,
  week: 7 * 24 * 60,
  weeks: 7 * 24 * 60,
}

const DURATION_RE = /(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|hr|h|days?|d|weeks?|wks?|wk|w)\b/i

/**
 * Parse the first duration token found in `text`. Returns clamped minutes,
 * or the default (24h) when nothing parseable is present.
 */
export function parseDuration(text: string): number {
  if (typeof text !== 'string' || !text.trim()) return DEFAULT_MINUTES
  const m = text.match(DURATION_RE)
  if (!m) return DEFAULT_MINUTES
  const value = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  const perUnit = UNIT_MINUTES[unit]
  if (!Number.isFinite(value) || value <= 0 || !perUnit) return DEFAULT_MINUTES
  const minutes = Math.round(value * perUnit)
  if (minutes < MIN_MINUTES) return MIN_MINUTES
  if (minutes > MAX_MINUTES) return MAX_MINUTES
  return minutes
}

export const __internals = { DEFAULT_MINUTES, MIN_MINUTES, MAX_MINUTES, UNIT_MINUTES }
