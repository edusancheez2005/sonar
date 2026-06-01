import { describe, it, expect } from 'vitest'
import { run as runGetTrendingNews } from '@/lib/orca/orchestrator/tools/getTrendingNews'

const now = () => new Date('2026-06-01T00:00:00Z')

function fakeSupabase(rows: any[] | { error: { message: string } }) {
  return {
    from(_t: string) {
      return {
        select(_c: string) {
          return this
        },
        gte(_c: string, _v: any) {
          return this
        },
        order(_c: string, _o: any) {
          return this
        },
        async limit(_n: number) {
          if (!Array.isArray(rows)) return { data: null, error: (rows as any).error }
          return { data: rows, error: null }
        },
      }
    },
  } as any
}

describe('getTrendingNews', () => {
  it('returns latest headlines deduped by title', async () => {
    const rows = [
      {
        title: 'BTC ETF flows surge to record',
        url: 'https://x/1',
        source: 'CoinDesk',
        published_at: '2026-05-31T22:00:00Z',
        content: 's1',
        ticker: 'BTC',
      },
      // duplicate title (different source) — should be dropped
      {
        title: 'BTC ETF flows surge to record',
        url: 'https://y/1',
        source: 'TheBlock',
        published_at: '2026-05-31T21:00:00Z',
        content: 's2',
        ticker: 'BTC',
      },
      {
        title: 'Fed signals dovish pivot',
        url: 'https://x/2',
        source: 'Bloomberg',
        published_at: '2026-05-31T20:00:00Z',
        content: 's3',
        ticker: null,
      },
    ]
    const r = await runGetTrendingNews({ limit: 5 }, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const data = r.data as any
    expect(data.count).toBe(2)
    expect(data.items[0].title).toBe('BTC ETF flows surge to record')
    expect(data.items[0].related_tickers).toEqual(['BTC'])
    expect(data.items[1].title).toBe('Fed signals dovish pivot')
  })

  it('errors when no recent news is found', async () => {
    const r = await runGetTrendingNews({}, fakeSupabase([]), now)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('no_recent_news')
  })

  it('falls back to latest headlines and flags stale when none are inside the window', async () => {
    const rows = [
      {
        title: 'Old but still the latest story',
        url: 'https://x/old',
        source: 'CoinDesk',
        // ~10 days old, outside the 72h window
        published_at: '2026-05-22T00:00:00Z',
        content: 'old summary',
        ticker: 'ETH',
      },
    ]
    const r = await runGetTrendingNews({}, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const data = r.data as any
    expect(data.stale).toBe(true)
    expect(data.count).toBe(1)
    expect(data.items[0].title).toBe('Old but still the latest story')
    expect(data.newest_age_hours).toBeGreaterThan(72)
  })

  it('marks fresh in-window news as not stale', async () => {
    const rows = [
      {
        title: 'Fresh story',
        url: 'https://x/fresh',
        source: 'CoinDesk',
        published_at: '2026-05-31T22:00:00Z',
        content: 'fresh',
        ticker: 'BTC',
      },
    ]
    const r = await runGetTrendingNews({}, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const data = r.data as any
    expect(data.stale).toBe(false)
    expect(data.newest_age_hours).toBeLessThanOrEqual(72)
  })

  it('caps the limit', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      title: `Story ${i}`,
      url: `https://x/${i}`,
      source: 's',
      published_at: '2026-05-31T20:00:00Z',
      content: 'summary',
      ticker: null,
    }))
    const r = await runGetTrendingNews({ limit: 999 }, fakeSupabase(rows), now)
    expect(r.ok).toBe(true)
    const data = r.data as any
    expect(data.count).toBeLessThanOrEqual(15)
  })

  it('surfaces query_failed on supabase error', async () => {
    const r = await runGetTrendingNews(
      {},
      fakeSupabase({ error: { message: 'boom' } } as any),
      now
    )
    expect(r.ok).toBe(false)
    expect(String(r.error)).toContain('query_failed')
  })
})
