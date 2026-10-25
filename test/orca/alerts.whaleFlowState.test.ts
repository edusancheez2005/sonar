import { describe, it, expect } from 'vitest'
import { stepWhaleFlow, REARM_AFTER_MS } from '@/lib/orca/alerts/whaleFlowState'

const H = 3_600_000
const T0 = Date.parse('2026-10-20T00:00:00Z')

describe('stepWhaleFlow (edge-triggered whale_flow)', () => {
  it('fires once per crossing, then stays quiet while the level stays high', () => {
    let s = stepWhaleFlow(null, 12_000_000, 10_000_000, T0)
    expect(s.fire).toBe(true)
    let fires = 1
    for (let h = 1; h < 20; h++) {
      s = stepWhaleFlow(s.next, 11_000_000 + h * 100_000, 10_000_000, T0 + h * H)
      if (s.fire) fires++
    }
    expect(fires).toBe(1)
  })

  it('re-arms when the level dips below half the threshold, then fires on the next crossing', () => {
    let s = stepWhaleFlow(null, 12_000_000, 10_000_000, T0)
    s = stepWhaleFlow(s.next, 4_000_000, 10_000_000, T0 + 2 * H) // < 50% → re-arm
    expect(s.fire).toBe(false)
    expect(s.next.armed).toBe(true)
    s = stepWhaleFlow(s.next, -10_500_000, 10_000_000, T0 + 3 * H)
    expect(s.fire).toBe(true)
  })

  it('does not re-arm on a shallow dip', () => {
    let s = stepWhaleFlow(null, 12_000_000, 10_000_000, T0)
    s = stepWhaleFlow(s.next, 7_000_000, 10_000_000, T0 + H)
    s = stepWhaleFlow(s.next, 12_000_000, 10_000_000, T0 + 2 * H)
    expect(s.fire).toBe(false)
  })

  it('re-arms 24 h after the last fire even if the level never dipped', () => {
    let s = stepWhaleFlow(null, 12_000_000, 10_000_000, T0)
    s = stepWhaleFlow(s.next, 12_000_000, 10_000_000, T0 + REARM_AFTER_MS - H)
    expect(s.fire).toBe(false)
    s = stepWhaleFlow(s.next, 12_000_000, 10_000_000, T0 + REARM_AFTER_MS)
    expect(s.fire).toBe(true)
  })

  it('never fires below the threshold', () => {
    expect(stepWhaleFlow(null, 9_999_999, 10_000_000, T0).fire).toBe(false)
  })
})
