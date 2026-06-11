import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/social/macroFactors', () => ({
  getMacroFactors: vi.fn(),
  MacroUnavailableError: class MacroUnavailableError extends Error {},
}))

import { run } from '@/lib/orca/orchestrator/tools/getMacroFactors'
import { getMacroFactors } from '@/lib/social/macroFactors'

const now = () => new Date('2026-06-10T12:00:00Z')

describe('getMacroFactors tool (§5.1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the ok ToolResult shape on success', async () => {
    ;(getMacroFactors as any).mockResolvedValue({
      factors: [{ title: 'Fed holds', impact: 'neutral', summary: 'No change.' }],
      overall_sentiment: 'neutral',
      last_updated: 'June 10, 2026',
      stale: false,
    })
    const r = await run({}, {} as any, now)
    expect(r.ok).toBe(true)
    expect(r.source).toBe('macro_factors')
    expect(r.fetched_at).toBe('2026-06-10T12:00:00.000Z')
    const d = r.data as any
    expect(d.factors).toHaveLength(1)
    expect(d.overall_sentiment).toBe('neutral')
    expect(d.last_updated).toBe('June 10, 2026')
    expect(d.stale).toBe(false)
  })

  it('passes through the stale flag', async () => {
    ;(getMacroFactors as any).mockResolvedValue({
      factors: [{ title: 'x', impact: 'bearish', summary: 'y' }],
      overall_sentiment: 'bearish',
      last_updated: 'June 9, 2026',
      stale: true,
    })
    const r = await run({}, {} as any, now)
    expect((r.data as any).stale).toBe(true)
  })

  it('degrades to ok:false / macro_unavailable on upstream failure (never throws)', async () => {
    ;(getMacroFactors as any).mockRejectedValue(new Error('macro_upstream_error'))
    const r = await run({}, {} as any, now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('macro_unavailable')
    expect(r.data).toBeNull()
    expect(r.source).toBe('macro_factors')
  })
})
