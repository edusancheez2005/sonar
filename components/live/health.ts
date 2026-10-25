/**
 * Freshness rules shared by the HealthChip (client) and /api/health/algorithm
 * (server). LIVE = the last poll succeeded within max(60 s, 2 × intervalMs)
 * AND the newest row is younger than liveMs; DELAYED = newest row younger
 * than delayedMs; STALE otherwise or after 3 consecutive failed polls.
 * liveMs = 2 × the p99 gap between Ethereum whale rows (243 s, measured
 * 2026-10-25), rounded up to 8 minutes.
 */
export const LIVE_THRESHOLDS = { liveMs: 8 * 60_000, delayedMs: 30 * 60_000 }

export type Health = 'live' | 'delayed' | 'stale'

export function healthOf(args: {
  newestAt: string | number | null | undefined
  now: number
  lastPollOkAt?: number | null
  intervalMs?: number
  consecutiveFailures?: number
  thresholds?: { liveMs: number; delayedMs: number }
}): Health {
  const th = args.thresholds ?? LIVE_THRESHOLDS
  if ((args.consecutiveFailures ?? 0) >= 3) return 'stale'
  const newest = typeof args.newestAt === 'number' ? args.newestAt : args.newestAt ? Date.parse(args.newestAt) : NaN
  if (!Number.isFinite(newest)) return 'stale'
  const age = args.now - newest
  const pollFresh = args.lastPollOkAt == null || args.now - args.lastPollOkAt <= Math.max(60_000, 2 * (args.intervalMs ?? 60_000))
  if (age <= th.liveMs && pollFresh) return 'live'
  if (age <= th.delayedMs) return 'delayed'
  return 'stale'
}
