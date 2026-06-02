import { describe, it, expect } from 'vitest'
import { trimTurnsForPrompt, __internals } from '@/lib/orca/chat/trimHistory'
import type { RecentTurn } from '@/lib/orca/chat/loadRecentHistory'

const { TRUNCATION_MARKER } = __internals

function turn(role: 'user' | 'assistant', content: string): RecentTurn {
  return { role, content }
}

describe('trimTurnsForPrompt', () => {
  it('caps the number of turns to maxTurns (keeps the most recent)', () => {
    const turns: RecentTurn[] = Array.from({ length: 20 }, (_, i) =>
      turn(i % 2 === 0 ? 'user' : 'assistant', `m${i}`)
    )
    const out = trimTurnsForPrompt(turns, { maxTurns: 12 })
    expect(out).toHaveLength(12)
    expect(out[0].content).toBe('m8')
    expect(out[11].content).toBe('m19')
  })

  it('truncates an over-long user turn with the marker', () => {
    const big = 'u'.repeat(900)
    const out = trimTurnsForPrompt([turn('user', big)], { maxUserChars: 500 })
    expect(out[0].content.endsWith(TRUNCATION_MARKER)).toBe(true)
    expect(out[0].content.length).toBe(500 + TRUNCATION_MARKER.length)
  })

  it('truncates an over-long assistant turn with the marker', () => {
    const big = 'a'.repeat(5000)
    const out = trimTurnsForPrompt([turn('assistant', big)], { maxAssistantChars: 2000 })
    expect(out[0].content.endsWith(TRUNCATION_MARKER)).toBe(true)
    expect(out[0].content.length).toBe(2000 + TRUNCATION_MARKER.length)
  })

  it('drops oldest turns once the total byte budget is exceeded', () => {
    // 10 assistant turns of 5000 chars each = 50000 > 40000 budget.
    const turns: RecentTurn[] = Array.from({ length: 10 }, (_, i) =>
      turn('assistant', `${i}`.padEnd(5000, 'x'))
    )
    const out = trimTurnsForPrompt(turns, { maxTurns: 12, maxAssistantChars: 5000 })
    expect(out.length).toBeLessThan(10)
    const total = out.reduce((s, t) => s + t.content.length, 0)
    expect(total).toBeLessThanOrEqual(__internals.TOTAL_BUDGET)
  })

  it('never drops below the last 2 turns even when over budget', () => {
    const turns: RecentTurn[] = [
      turn('user', 'x'.repeat(500)),
      turn('assistant', 'y'.repeat(2000)),
    ].map((t) => ({ ...t, content: t.content.repeat(30) }))
    // Both turns are huge; budget enforcement must still keep both.
    const out = trimTurnsForPrompt(turns, {
      maxTurns: 12,
      maxUserChars: 100000,
      maxAssistantChars: 100000,
    })
    expect(out).toHaveLength(2)
  })

  it('returns [] for empty input', () => {
    expect(trimTurnsForPrompt([])).toEqual([])
  })

  it('filters out malformed rows (missing role/content)', () => {
    const turns = [
      turn('user', 'ok'),
      { role: 'system', content: 'nope' } as any,
      { role: 'user', content: '' } as any,
      { role: 'assistant' } as any,
      turn('assistant', 'fine'),
    ]
    const out = trimTurnsForPrompt(turns)
    expect(out.map((t) => t.content)).toEqual(['ok', 'fine'])
  })

  it('leaves content at the exact cap untouched (no marker)', () => {
    const exact = 'u'.repeat(500)
    const out = trimTurnsForPrompt([turn('user', exact)], { maxUserChars: 500 })
    expect(out[0].content).toBe(exact)
    expect(out[0].content.includes(TRUNCATION_MARKER)).toBe(false)
  })
})
