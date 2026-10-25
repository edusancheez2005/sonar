import { describe, it, expect } from 'vitest'
import { healthOf, LIVE_THRESHOLDS } from '@/components/live/HealthChip'

const now = Date.parse('2026-10-25T12:00:00Z')
const ago = (ms: number) => new Date(now - ms).toISOString()

describe('healthOf', () => {
  it('is LIVE when the newest row is under 8 min old and the last poll succeeded', () => {
    expect(healthOf({ newestAt: ago(60_000), now, lastPollOkAt: now - 30_000, intervalMs: 60_000 })).toBe('live')
  })
  it('is DELAYED between 8 and 30 min, STALE after', () => {
    expect(healthOf({ newestAt: ago(10 * 60_000), now })).toBe('delayed')
    expect(healthOf({ newestAt: ago(31 * 60_000), now })).toBe('stale')
  })
  it('is never LIVE when the client has not reached the server for two intervals', () => {
    expect(healthOf({ newestAt: ago(60_000), now, lastPollOkAt: now - 3 * 60_000, intervalMs: 60_000 })).toBe('delayed')
  })
  it('is STALE with no data or after 3 failed polls', () => {
    expect(healthOf({ newestAt: null, now })).toBe('stale')
    expect(healthOf({ newestAt: ago(1000), now, consecutiveFailures: 3 })).toBe('stale')
  })
  it('takes per-instance thresholds (the hourly wallet poller)', () => {
    const th = { liveMs: 2 * 3_600_000, delayedMs: 6 * 3_600_000 }
    expect(healthOf({ newestAt: ago(90 * 60_000), now, thresholds: th })).toBe('live')
    expect(healthOf({ newestAt: ago(3 * 3_600_000), now, thresholds: th })).toBe('delayed')
    expect(healthOf({ newestAt: ago(7 * 3_600_000), now, thresholds: th })).toBe('stale')
  })
  it('exports the default thresholds', () => {
    // LIVE = 2 × the p99 gap between Ethereum rows (243 s on 2026-10-25), rounded up.
    expect(LIVE_THRESHOLDS).toEqual({ liveMs: 8 * 60_000, delayedMs: 30 * 60_000 })
  })
})
