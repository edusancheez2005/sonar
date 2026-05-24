import { describe, it, expect } from 'vitest'
import { pickCopilotGreeting } from '@/lib/orca/greetings'

const EMOJI_RE = /\p{Extended_Pictographic}/u

describe('pickCopilotGreeting', () => {
  it('returns a non-empty string for every experience level when watchlist is empty', () => {
    for (const exp of ['new', 'intermediate', 'advanced'] as const) {
      const out = pickCopilotGreeting({ experience: exp, tickers: [] })
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(0)
    }
  })

  it('names the first ticker when one ticker is supplied', () => {
    const out = pickCopilotGreeting({ experience: 'intermediate', tickers: ['BTC'] })
    expect(out).toContain('BTC')
  })

  it('names the first two tickers when more than two are supplied', () => {
    const out = pickCopilotGreeting({ experience: 'advanced', tickers: ['BTC', 'SOL', 'ETH'] })
    expect(out).toContain('BTC')
    expect(out).toContain('SOL')
    expect(out).not.toContain('ETH')
  })

  it('falls back to intermediate tone when experience is null or unknown', () => {
    const known = pickCopilotGreeting({ experience: 'intermediate', tickers: ['BTC'] })
    const nullExp = pickCopilotGreeting({ experience: null, tickers: ['BTC'] })
    const junk = pickCopilotGreeting({ experience: 'wizard' as any, tickers: ['BTC'] })
    expect(nullExp).toBe(known)
    expect(junk).toBe(known)
  })

  it('drops malformed tickers from the greeting (sanitises caller input)', () => {
    const out = pickCopilotGreeting({
      experience: 'intermediate',
      tickers: ['btc lowercase!', 'SOL', '<script>'],
    })
    expect(out).toContain('SOL')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('btc lowercase')
  })

  it('contains no emoji on any branch', () => {
    const branches = [
      pickCopilotGreeting({ experience: 'new', tickers: [] }),
      pickCopilotGreeting({ experience: 'intermediate', tickers: [] }),
      pickCopilotGreeting({ experience: 'advanced', tickers: [] }),
      pickCopilotGreeting({ experience: 'new', tickers: ['BTC'] }),
      pickCopilotGreeting({ experience: 'intermediate', tickers: ['BTC', 'SOL'] }),
      pickCopilotGreeting({ experience: 'advanced', tickers: ['BTC', 'SOL'] }),
    ]
    for (const g of branches) {
      expect(EMOJI_RE.test(g), `emoji found in greeting: ${g}`).toBe(false)
    }
  })
})
