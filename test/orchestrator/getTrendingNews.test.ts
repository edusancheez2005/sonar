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
        summary: 's1',
        related_tickers: 'BTC',
      },
      // duplicate title (different source) — should be dropped
      {
        title: 'BTC ETF flows surge to record',
        url: 'https://y/1',
        source: 'TheBlock',
        published_at: '2026-05-31T21:00:00Z',
        summary: 's2',
        related_tickers: ['BTC'],
      },
      {
        title: 'Fed signals dovish pivot',
        url: 'https://x/2',
        source: 'Bloomberg',
        published_at: '2026-05-31T20:00:00Z',
        summary: 's3',
        related_tickers: '',
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

  it('caps the limit', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      title: `Story ${i}`,
      url: `https://x/${i}`,
      source: 's',
      published_at: '2026-05-31T20:00:00Z',
      summary: 'summary',
      related_tickers: null,
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
