import { describe, it, expect } from 'vitest'
import {
  evaluatePriceMove,
  evaluateWhaleFlow,
  evaluateSignalFlip,
  evaluateNewsImpact,
} from '@/lib/orca/alerts/evaluators'

/**
 * Minimal chainable Supabase query mock. Every chain method returns `this`;
 * the builder is thenable so `await` resolves to { data }.
 */
function makeSupabase(byTable: Record<string, any[]>) {
  return {
    from(table: string) {
      const rows = byTable[table] ?? []
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        limit: () => Promise.resolve({ data: rows }),
        then: (resolve: any) => resolve({ data: rows }),
      }
      return builder
    },
  }
}

const NOW = () => new Date('2026-06-03T12:00:00Z')

describe('evaluatePriceMove', () => {
  it('fires when |change| >= threshold', async () => {
    const sb = makeSupabase({ price_snapshots: [{ price_change_24h: 8.2 }] })
    const c = await evaluatePriceMove('SOL', 5, sb)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('price_move')
  })
  it('does not fire below threshold', async () => {
    const sb = makeSupabase({ price_snapshots: [{ price_change_24h: 2 }] })
    expect(await evaluatePriceMove('SOL', 5, sb)).toBeNull()
  })
  it('returns null with no data', async () => {
    const sb = makeSupabase({ price_snapshots: [] })
    expect(await evaluatePriceMove('SOL', 5, sb)).toBeNull()
  })
})

describe('evaluateWhaleFlow', () => {
  it('fires when |net| >= threshold', async () => {
    const sb = makeSupabase({
      all_whale_transactions: [
        { usd_value: 2_000_000, classification: 'buy' },
        { usd_value: 500_000, classification: 'sell' },
      ],
    })
    const c = await evaluateWhaleFlow('ETH', 1_000_000, sb, NOW)
    expect(c).not.toBeNull()
    expect((c!.payload.raw as any).netUsd).toBe(1_500_000)
  })
  it('does not fire below threshold', async () => {
    const sb = makeSupabase({
      all_whale_transactions: [{ usd_value: 100_000, classification: 'buy' }],
    })
    expect(await evaluateWhaleFlow('ETH', 1_000_000, sb, NOW)).toBeNull()
  })
})

describe('evaluateSignalFlip', () => {
  it('fires when the latest directional signal differs from prior', async () => {
    const sb = makeSupabase({
      token_signals: [
        { signal: 'STRONG BUY', confidence: 80, computed_at: '2026-06-03T11:00:00Z' },
        { signal: 'NEUTRAL', confidence: 60, computed_at: '2026-06-03T10:00:00Z' },
      ],
    })
    const c = await evaluateSignalFlip('SOL', sb)
    expect(c).not.toBeNull()
    expect((c!.payload.raw as any).to).toBe('STRONG BUY')
  })
  it('does not fire when unchanged', async () => {
    const sb = makeSupabase({
      token_signals: [
        { signal: 'BUY', confidence: 80, computed_at: '2026-06-03T11:00:00Z' },
        { signal: 'BUY', confidence: 70, computed_at: '2026-06-03T10:00:00Z' },
      ],
    })
    expect(await evaluateSignalFlip('SOL', sb)).toBeNull()
  })
  it('does not fire when the latest is non-directional', async () => {
    const sb = makeSupabase({
      token_signals: [
        { signal: 'NEUTRAL', confidence: 80, computed_at: '2026-06-03T11:00:00Z' },
        { signal: 'BUY', confidence: 70, computed_at: '2026-06-03T10:00:00Z' },
      ],
    })
    expect(await evaluateSignalFlip('SOL', sb)).toBeNull()
  })
})

describe('evaluateNewsImpact', () => {
  it('fires on a high-|sentiment| headline', async () => {
    const sb = makeSupabase({
      news_items: [{ title: 'Major upgrade ships', sentiment_score: 0.82, url: 'https://x/y' }],
    })
    const c = await evaluateNewsImpact('SOL', sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('news_high_impact')
  })
  it('does not fire on a low-sentiment headline', async () => {
    const sb = makeSupabase({
      news_items: [{ title: 'Minor note', sentiment_score: 0.1, url: 'https://x/y' }],
    })
    expect(await evaluateNewsImpact('SOL', sb, NOW)).toBeNull()
  })
})
