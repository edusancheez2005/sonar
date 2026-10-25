'use client'
/**
 * Per-section freshness chip: LIVE / DELAYED / STALE, never a page-wide dot.
 * LIVE = the last poll succeeded within max(60 s, 2 × intervalMs) AND the
 * newest row is younger than liveMs; DELAYED = newest row younger than
 * delayedMs; STALE otherwise or after 3 consecutive failed polls.
 * Prompt 6 tunes LIVE_THRESHOLDS from measured inter-arrival gaps.
 */
import React from 'react'
import { T } from '@/lib/ui/tokens'

export const LIVE_THRESHOLDS = { liveMs: 5 * 60_000, delayedMs: 30 * 60_000 }

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

const LOOK: Record<Health, { label: string; fg: string; bg: string }> = {
  live: { label: 'LIVE', fg: T.posText, bg: T.posBg },
  delayed: { label: 'DELAYED', fg: T.warn, bg: T.warnBg },
  stale: { label: 'STALE', fg: T.negText, bg: T.negBg },
}

export function HealthChip(props: {
  health: Health
  title?: string
  testId?: string
}) {
  const look = LOOK[props.health]
  return (
    <span
      role="status"
      aria-live="polite"
      title={props.title}
      data-testid={props.testId || 'health-chip'}
      data-health={props.health}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '2px 8px', borderRadius: T.radius.sm,
        fontFamily: T.font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
        color: look.fg, background: look.bg, border: `1px solid ${look.fg}33`,
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: T.radius.pill, background: look.fg }} />
      {look.label}
    </span>
  )
}

export default HealthChip
