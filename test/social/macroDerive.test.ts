import { describe, it, expect } from 'vitest'
import { deriveOverall, countImpacts, withDerivedOverall } from '@/lib/social/macroFactors'

const f = (impact: 'bullish' | 'bearish' | 'neutral') => ({ title: 't', summary: 's', impact })
const n = (b: number, r: number, z = 0) => [...Array(b)].map(() => f('bullish')).concat([...Array(r)].map(() => f('bearish')), [...Array(z)].map(() => f('neutral')))

describe('deriveOverall', () => {
  it('needs a lead of two factors', () => {
    expect(deriveOverall(n(4, 2))).toBe('bullish')
    expect(deriveOverall(n(3, 2))).toBe('neutral')
    expect(deriveOverall(n(2, 2, 3))).toBe('neutral')
    expect(deriveOverall(n(1, 4))).toBe('bearish')
    expect(deriveOverall([])).toBe('neutral')
  })
  it('counts every impact', () => {
    expect(countImpacts(n(1, 4, 2))).toEqual({ bullish: 1, bearish: 4, neutral: 2 })
  })
  it('re-derives an old cache row and keeps the model verdict for reference', () => {
    const r = withDerivedOverall({ factors: n(0, 3, 1) as any, overall_sentiment: 'bullish', last_updated: 'x', stale: false }, '2026-10-25T06:00:00.000Z')
    expect(r.overall_sentiment).toBe('bearish')
    expect(r.llm_overall_sentiment).toBe('bullish')
    expect(r.derived_from).toBe('factors')
    expect(r.generated_at).toBe('2026-10-25T06:00:00.000Z')
  })
})
