import { describe, it, expect } from 'vitest'
import { classifyCodeSpan } from '@/components/orca/inline/parsers/classifyCodeSpan'

describe('classifyCodeSpan', () => {
  it('detects price with $', () => {
    const r = classifyCodeSpan('$76,432', 'BTC price is $76,432 today')
    expect(r.kind).toBe('price')
    expect(r.value).toBe(76432)
  })

  it('detects whale flow when paragraph mentions whale', () => {
    const r = classifyCodeSpan('+$1.01B', 'Net whale flow last 24h +$1.01B')
    expect(r.kind).toBe('whale')
  })

  it('detects sentiment number with sentiment context', () => {
    const r = classifyCodeSpan('62', 'Sentiment 62 (provider LunarCrush)')
    expect(r.kind).toBe('sentiment')
    expect(r.value).toBe(62)
  })

  it('ignores plain bare numbers without context', () => {
    expect(classifyCodeSpan('62', 'Block height 62 mined').kind).toBe('none')
  })

  it('ignores non-numeric code', () => {
    expect(classifyCodeSpan('foo()', 'see foo()').kind).toBe('none')
  })

  it('ignores percentages', () => {
    expect(classifyCodeSpan('-1.91%', '24h -1.91%').kind).toBe('none')
  })

  it('parses suffixed magnitudes', () => {
    const r = classifyCodeSpan('+$1.01B', 'whale flow +$1.01B in')
    expect(r.value).toBeCloseTo(1.01e9)
  })

  it('empty input → none', () => {
    expect(classifyCodeSpan('', '').kind).toBe('none')
  })
})
