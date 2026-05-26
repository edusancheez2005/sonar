import { describe, it, expect } from 'vitest'
import { getSuggestedChips } from '@/lib/orca/suggestedChips'

describe('getSuggestedChips', () => {
  it('returns default chips when context is empty', () => {
    const chips = getSuggestedChips()
    expect(chips).toHaveLength(3)
    expect(chips[0].label).toMatch(/macro/i)
    expect(chips[1].label).toMatch(/whale/i)
    expect(chips[2].label).toMatch(/social/i)
  })

  it('returns ticker-specific chips when ticker is supplied', () => {
    const chips = getSuggestedChips({ ticker: 'BTC' })
    expect(chips).toHaveLength(4)
    expect(chips[0].label).toContain('$BTC')
    expect(chips[3].prompt).toBe('Add BTC to my watchlist')
  })

  it('normalises ticker case and strips $ prefix', () => {
    const chips = getSuggestedChips({ ticker: '$sol' })
    expect(chips[0].label).toContain('$SOL')
  })

  it('falls back to defaults if ticker is malformed', () => {
    const chips = getSuggestedChips({ ticker: 'NOT A TICKER' })
    expect(chips).toHaveLength(3)
    expect(chips[0].label).toMatch(/macro/i)
  })

  it('returns wallet chips when wallet looks like an EVM address', () => {
    const addr = '0x' + 'a'.repeat(40)
    const chips = getSuggestedChips({ wallet: addr })
    expect(chips).toHaveLength(3)
    expect(chips[0].label).toMatch(/doing/i)
    expect(chips[0].prompt).toContain(addr)
  })

  it('shortens long addresses in chip labels', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    const chips = getSuggestedChips({ wallet: addr })
    expect(chips[0].label).toContain('0x1234…5678')
    // but the prompt sent to the API keeps the full address
    expect(chips[0].prompt).toContain(addr)
  })

  it('ticker context takes priority over wallet context', () => {
    const chips = getSuggestedChips({ ticker: 'ETH', wallet: '0x' + 'b'.repeat(40) })
    expect(chips[0].label).toContain('$ETH')
  })

  it('falls back to defaults when wallet is not a valid address', () => {
    const chips = getSuggestedChips({ wallet: 'not-an-address' })
    expect(chips).toHaveLength(3)
    expect(chips[0].label).toMatch(/macro/i)
  })
})
