'use client'
/**
 * Freshness of the Ethereum whale feed from /api/health/algorithm, once a
 * minute and never while the tab is hidden. For pages that show the feed's
 * state without polling its rows (whale terminal pages, the dashboard).
 */
import { useLivePoll } from './useLivePoll'
import { healthOf, type Health } from './health'

export function useWhaleFeedHealth(enabled = true): { health: Health; lastTs: number | null; polled: boolean } {
  const poll = useLivePoll((signal) => fetch('/api/health/algorithm', { cache: 'no-store', signal }), { intervalMs: 60_000, enabled })
  const lastTs: number | null = poll.data?.lastTs ?? null
  const health = healthOf({
    newestAt: lastTs,
    now: Date.now() + (poll.offsetMs || 0),
    lastPollOkAt: poll.lastFetchedAt,
    intervalMs: 60_000,
    consecutiveFailures: poll.consecutiveFailures,
  })
  return { health, lastTs, polled: poll.pollsOk > 0 || poll.consecutiveFailures > 0 }
}
