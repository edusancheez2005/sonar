import { describe, it, expect } from 'vitest'
import { derivePriorSubject } from '@/lib/orca/chat/priorSubject'
import type { RecentTurn } from '@/lib/orca/chat/loadRecentHistory'

const turns: RecentTurn[] = [
  { role: 'user', content: 'top whale moves this week' },
  { role: 'assistant', content: 'Here are the top whale-flow tokens…' },
]

describe('derivePriorSubject (§4.1)', () => {
  it('returns {} when there is no history (a follow-up needs a prior turn)', () => {
    expect(derivePriorSubject([], { data_sources_used: { intent: 'data_query' }, tickers_mentioned: ['BTC'] })).toEqual({})
  })

  it('returns {} when there is no last chat row', () => {
    expect(derivePriorSubject(turns, null)).toEqual({})
  })

  it('extracts priorIntent + priorTickers (uppercased, deduped)', () => {
    const out = derivePriorSubject(turns, {
      data_sources_used: { intent: 'data_query' },
      tickers_mentioned: ['btc', 'eth', 'btc'],
    })
    expect(out.priorIntent).toBe('data_query')
    expect(out.priorTickers).toEqual(['BTC', 'ETH'])
  })

  it('ignores an invalid intent', () => {
    const out = derivePriorSubject(turns, { data_sources_used: { intent: 'not_a_real_intent' }, tickers_mentioned: [] })
    expect(out.priorIntent).toBeUndefined()
  })

  it('tolerates missing fields', () => {
    expect(derivePriorSubject(turns, {})).toEqual({})
    expect(derivePriorSubject(turns, { tickers_mentioned: 'nope' as any })).toEqual({})
  })
})
