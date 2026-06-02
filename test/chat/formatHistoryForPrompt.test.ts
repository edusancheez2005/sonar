import { describe, it, expect } from 'vitest'
import { formatHistoryForPrompt } from '@/lib/orca/chat/formatHistoryForPrompt'
import type { RecentTurn } from '@/lib/orca/chat/loadRecentHistory'

describe('formatHistoryForPrompt', () => {
  it('returns an empty string for no turns', () => {
    expect(formatHistoryForPrompt([])).toBe('')
    expect(formatHistoryForPrompt(null as any)).toBe('')
  })

  it('renders a single user turn with the header + preamble + footer', () => {
    const out = formatHistoryForPrompt([{ role: 'user', content: 'hello' }])
    expect(out).toContain('PRIOR CONVERSATION TURNS')
    expect(out).toContain('[TURN 1 — USER] hello')
    expect(out).toContain('End of prior turns')
  })

  it('renders many turns and pairs assistant lines to the user turn number', () => {
    const turns: RecentTurn[] = [
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'a2' },
    ]
    const out = formatHistoryForPrompt(turns)
    expect(out).toContain('[TURN 1 — USER] q1')
    expect(out).toContain('[TURN 1 — ORCA] a1')
    expect(out).toContain('[TURN 2 — USER] q2')
    expect(out).toContain('[TURN 2 — ORCA] a2')
  })

  it('preserves a truncation marker that is already in the content', () => {
    const out = formatHistoryForPrompt([
      { role: 'assistant', content: 'long answer… [truncated]' },
    ])
    expect(out).toContain('… [truncated]')
  })

  it('orders turns oldest → newest in the rendered output', () => {
    const out = formatHistoryForPrompt([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ])
    expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'))
  })
})
