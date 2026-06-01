import { describe, it, expect } from 'vitest'
import {
  formatUsd,
  formatPriceMove,
  formatWhaleFlow,
  formatSignalFlip,
  formatNewsImpact,
} from '@/lib/orca/alerts/format'

// HARD RULE §0.4: rendered title + body must never contain a directional verb.
const FORBIDDEN = /\b(buy|sell|target|rally|crash|moon|dump|long|short)\b/i

function assertNeutral(copy: { title: string; body: string }) {
  expect(copy.title).not.toMatch(FORBIDDEN)
  expect(copy.body).not.toMatch(FORBIDDEN)
}

describe('formatUsd', () => {
  it('formats millions / thousands / units with sign', () => {
    expect(formatUsd(1_400_000)).toBe('+$1.40M')
    expect(formatUsd(-442_000)).toBe('-$442k')
    expect(formatUsd(980)).toBe('+$980')
    expect(formatUsd(2_500_000_000)).toBe('+$2.50B')
  })
})

describe('formatPriceMove', () => {
  it('produces neutral copy', () => {
    const c = formatPriceMove('SOL', 6.23)
    expect(c.title).toContain('SOL')
    expect(c.payload.kind).toBe('price_move')
    expect(c.payload.ticker).toBe('SOL')
    assertNeutral(c)
  })
  it('handles negative moves neutrally', () => {
    assertNeutral(formatPriceMove('BTC', -11.5))
  })
})

describe('formatWhaleFlow', () => {
  it('produces neutral copy and keeps net in payload', () => {
    const c = formatWhaleFlow('ETH', 3_200_000)
    expect(c.payload.kind).toBe('whale_flow')
    expect((c.payload.raw as any).netUsd).toBe(3_200_000)
    assertNeutral(c)
  })
  it('handles net outflow neutrally', () => {
    assertNeutral(formatWhaleFlow('ETH', -3_200_000))
  })
})

describe('formatSignalFlip', () => {
  it('keeps direction labels out of rendered text but in payload', () => {
    const c = formatSignalFlip('SOL', 'NEUTRAL', 'STRONG BUY', 78.4)
    assertNeutral(c)
    expect((c.payload.raw as any).from).toBe('NEUTRAL')
    expect((c.payload.raw as any).to).toBe('STRONG BUY')
  })
})

describe('formatNewsImpact', () => {
  it('produces neutral copy with an article re-ask', () => {
    const c = formatNewsImpact('SOL', 'Network sees record activity', 0.81, 'https://x/y')
    assertNeutral(c)
    expect(c.payload.kind).toBe('news_high_impact')
    expect(c.payload.reask?.url).toBe('https://x/y')
  })
})
