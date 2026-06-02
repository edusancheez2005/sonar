import { describe, it, expect } from 'vitest'
import { parseDuration, __internals } from '@/lib/orca/orchestrator/parseDuration'

const { DEFAULT_MINUTES, MIN_MINUTES, MAX_MINUTES } = __internals

describe('parseDuration', () => {
  it('parses hours (24h)', () => {
    expect(parseDuration('mute BTC for 24h')).toBe(1440)
  })

  it('parses days (3d)', () => {
    expect(parseDuration('3d')).toBe(3 * 24 * 60)
  })

  it('parses weeks (1w)', () => {
    expect(parseDuration('mute SOL 1w')).toBe(7 * 24 * 60)
  })

  it('parses minutes (30m)', () => {
    expect(parseDuration('30m')).toBe(30)
  })

  it('parses spaced units (15 hours)', () => {
    expect(parseDuration('mute for 15 hours')).toBe(15 * 60)
  })

  it('parses fractional values (1.5h)', () => {
    expect(parseDuration('1.5h')).toBe(90)
  })

  it('returns the default when no unit is present', () => {
    expect(parseDuration('mute BTC please')).toBe(DEFAULT_MINUTES)
  })

  it('caps at 30 days', () => {
    expect(parseDuration('mute for 60d')).toBe(MAX_MINUTES)
  })

  it('clamps below the 5-minute minimum', () => {
    expect(parseDuration('mute for 2m')).toBe(MIN_MINUTES)
  })

  it('returns the default for empty input', () => {
    expect(parseDuration('')).toBe(DEFAULT_MINUTES)
  })
})
