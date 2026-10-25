import { describe, it, expect } from 'vitest'
import { mergeRows, roundDownIso } from '@/components/live/mergeRows'

const row = (h: string, ts: string) => ({ transaction_hash: h, timestamp: ts })

describe('mergeRows', () => {
  const prev = [row('b', '2026-10-25T12:00:10Z'), row('a', '2026-10-25T12:00:00Z')]

  it('puts new rows first and reports only them', () => {
    const { rows, newIds } = mergeRows(prev, [row('c', '2026-10-25T12:00:20Z')], 10)
    expect(rows.map((r) => r.transaction_hash)).toEqual(['c', 'b', 'a'])
    expect(newIds).toEqual(['c'])
  })

  it('ignores rows already on screen and duplicates inside one poll', () => {
    const { rows, newIds } = mergeRows(prev, [row('b', '2026-10-25T12:00:10Z'), row('d', '2026-10-25T12:00:30Z'), row('d', '2026-10-25T12:00:30Z')], 10)
    expect(rows.map((r) => r.transaction_hash)).toEqual(['d', 'b', 'a'])
    expect(newIds).toEqual(['d'])
  })

  it('keeps the cap and does not report rows pushed past it', () => {
    const { rows, newIds } = mergeRows(prev, [row('old', '2026-10-25T11:00:00Z'), row('new', '2026-10-25T12:01:00Z')], 2)
    expect(rows.map((r) => r.transaction_hash)).toEqual(['new', 'b'])
    expect(newIds).toEqual(['new'])
  })

  it('returns the same rows when nothing is new', () => {
    const { rows, newIds } = mergeRows(prev, [], 10)
    expect(rows).toEqual(prev)
    expect(newIds).toEqual([])
  })
})

describe('roundDownIso', () => {
  it('rounds down to 10 s so tabs share cache keys', () => {
    expect(roundDownIso(Date.parse('2026-10-25T12:00:19.900Z'))).toBe('2026-10-25T12:00:10.000Z')
  })
})
