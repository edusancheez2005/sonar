'use client'
/**
 * Per-section freshness chip: LIVE / DELAYED / STALE, never a page-wide dot.
 * The rules live in ./health so server routes can share them.
 */
import React from 'react'
import { T } from '@/lib/ui/tokens'

export { LIVE_THRESHOLDS, healthOf } from './health'
export type { Health } from './health'
import type { Health } from './health'

const LOOK: Record<Health, { label: string; fg: string; bg: string }> = {
  live: { label: 'LIVE', fg: T.posText, bg: T.posBg },
  delayed: { label: 'DELAYED', fg: T.warn, bg: T.warnBg },
  stale: { label: 'STALE', fg: T.negText, bg: T.negBg },
}

export function HealthChip(props: {
  health: Health
  title?: string
  testId?: string
  /** Names the feed, e.g. "ETH whale feed" → "ETH whale feed · LIVE". */
  prefix?: string
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
      {props.prefix ? `${props.prefix} · ${look.label}` : look.label}
    </span>
  )
}

export default HealthChip
