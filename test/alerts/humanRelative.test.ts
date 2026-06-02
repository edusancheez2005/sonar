import { describe, it, expect } from 'vitest'
import { humanRelative } from '@/lib/orca/alerts/humanRelative'

const NOW = () => new Date('2026-06-04T12:00:00Z')
const at = (ms: number) => new Date(NOW().getTime() + ms).toISOString()

describe('humanRelative', () => {
  it('returns "indefinitely" for null / undefined', () => {
    expect(humanRelative(null, NOW)).toBe('indefinitely')
    expect(humanRelative(undefined, NOW)).toBe('indefinitely')
  })

  it('returns "indefinitely" for an invalid date', () => {
    expect(humanRelative('not-a-date', NOW)).toBe('indefinitely')
  })

  it('returns "in the past" for an elapsed timestamp', () => {
    expect(humanRelative(at(-60_000), NOW)).toBe('in the past')
  })

  it('formats near-future minutes', () => {
    expect(humanRelative(at(30 * 60_000), NOW)).toBe('in 30 minutes')
    expect(humanRelative(at(60_000), NOW)).toBe('in 1 minute')
  })

  it('formats hours', () => {
    expect(humanRelative(at(24 * 60 * 60_000), NOW)).toBe('in 24 hours')
  })

  it('formats days and weeks', () => {
    expect(humanRelative(at(3 * 24 * 60 * 60_000), NOW)).toBe('in 3 days')
    expect(humanRelative(at(21 * 24 * 60 * 60_000), NOW)).toBe('in 3 weeks')
  })
})
