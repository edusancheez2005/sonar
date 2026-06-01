/**
 * ORCA Alerts — dedup hour helper
 * =============================================================================
 * The per-rule-per-hour cap (HARD RULE §0.5) is enforced by the
 * UNIQUE (user_id, rule_id, dedup_hour) index on user_notifications.
 * `dedupHour` floors any instant to the start of its UTC hour so two
 * triggers of the same rule inside one hour collide on insert.
 */

/**
 * Floor `at` to the start of its UTC hour and return an ISO string. This is
 * the JS equivalent of Postgres `date_trunc('hour', now())` evaluated in UTC.
 */
export function dedupHour(at: Date = new Date()): string {
  const d = new Date(at.getTime())
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}
