import { describe, it, expect } from 'vitest'
import {
  evaluatePriceMove,
  evaluateWhaleFlow,
  evaluateSignalFlip,
  evaluateNewsImpact,
  evaluateWalletActivity,
  evaluateNewsAny,
  evaluateSocialPost,
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
        or: () => builder,
        contains: () => builder,
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
  // price_snapshots are newest-first; the evaluator pairs the latest price with
  // the oldest snapshot >= 45 min back to compute a ~1h move.
  const snaps = (latest: number, old: number) => [
    { price_usd: latest, timestamp: '2026-06-03T11:55:00Z' },
    { price_usd: old, timestamp: '2026-06-03T11:00:00Z' },
  ]
  it('fires when |1h change| >= threshold', async () => {
    const sb = makeSupabase({ price_snapshots: snaps(108.2, 100) })
    const c = await evaluatePriceMove('SOL', 5, sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('price_move')
  })
  it('does not fire below threshold', async () => {
    const sb = makeSupabase({ price_snapshots: snaps(102, 100) })
    expect(await evaluatePriceMove('SOL', 5, sb, NOW)).toBeNull()
  })
  it('floors at 1% even when the rule threshold is tiny', async () => {
    const sb = makeSupabase({ price_snapshots: snaps(100.4, 100) })
    expect(await evaluatePriceMove('SOL', 0.1, sb, NOW)).toBeNull()
  })
  it('returns null with no data', async () => {
    const sb = makeSupabase({ price_snapshots: [] })
    expect(await evaluatePriceMove('SOL', 5, sb, NOW)).toBeNull()
  })
  it('returns null when history is too short to span ~1h', async () => {
    const sb = makeSupabase({
      price_snapshots: [
        { price_usd: 110, timestamp: '2026-06-03T11:55:00Z' },
        { price_usd: 100, timestamp: '2026-06-03T11:50:00Z' },
      ],
    })
    expect(await evaluatePriceMove('SOL', 5, sb, NOW)).toBeNull()
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
      news_items: [{ title: 'Major upgrade ships', sentiment_llm: 0.82, url: 'https://x/y' }],
    })
    const c = await evaluateNewsImpact('SOL', sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('news_high_impact')
  })
  it('does not fire on a low-sentiment headline', async () => {
    const sb = makeSupabase({
      news_items: [{ title: 'Minor note', sentiment_llm: 0.1, url: 'https://x/y' }],
    })
    expect(await evaluateNewsImpact('SOL', sb, NOW)).toBeNull()
  })
})

describe('evaluateWalletActivity', () => {
  it('fires on recent movement and aggregates transactions', async () => {
    const sb = makeSupabase({
      all_whale_transactions: [
        { usd_value: 2_000_000, token_symbol: 'PEPE', blockchain: 'ethereum' },
        { usd_value: 500_000, token_symbol: 'USDC', blockchain: 'ethereum' },
      ],
    })
    const c = await evaluateWalletActivity('0xabc', null, null, sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('wallet_activity')
    expect((c!.payload.raw as any).txCount).toBe(2)
    expect((c!.payload.raw as any).totalUsd).toBe(2_500_000)
  })
  it('respects the minimum-size threshold', async () => {
    const sb = makeSupabase({
      all_whale_transactions: [{ usd_value: 100, token_symbol: 'X', blockchain: 'ethereum' }],
    })
    expect(await evaluateWalletActivity('0xabc', 1_000_000, null, sb, NOW)).toBeNull()
  })
  it('returns null with no movement', async () => {
    const sb = makeSupabase({ all_whale_transactions: [] })
    expect(await evaluateWalletActivity('0xabc', null, null, sb, NOW)).toBeNull()
  })
})

describe('evaluateNewsAny', () => {
  it('fires on any recent article regardless of sentiment', async () => {
    const sb = makeSupabase({
      news_items: [{ title: 'Routine update', url: 'https://x/y' }],
    })
    const c = await evaluateNewsAny('SOL', sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('news_any')
  })
  it('returns null with no articles', async () => {
    const sb = makeSupabase({ news_items: [] })
    expect(await evaluateNewsAny('SOL', sb, NOW)).toBeNull()
  })
})

describe('evaluateSocialPost', () => {
  it('fires on a recent mention', async () => {
    const sb = makeSupabase({
      social_posts: [
        { body: 'Heavy volume noted', creator_screen_name: 'watcher', url: 'https://t/1', interactions: 900 },
      ],
    })
    const c = await evaluateSocialPost('SOL', sb, NOW)
    expect(c).not.toBeNull()
    expect(c!.payload.kind).toBe('social_post')
    expect(c!.title).toContain('@watcher')
  })
  it('returns null with no posts', async () => {
    const sb = makeSupabase({ social_posts: [] })
    expect(await evaluateSocialPost('SOL', sb, NOW)).toBeNull()
  })
})
