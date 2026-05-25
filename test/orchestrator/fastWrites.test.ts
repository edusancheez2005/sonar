/**
 * Unit tests for the fastWrites detector (v4 §5.1).
 *
 * Strategy: pure function, no I/O. We assert match/no-match on a wide
 * matrix of natural phrasings and a curated list of phrases the detector
 * MUST NOT match (so we never accidentally fire a write on a read query).
 */
import { describe, it, expect } from 'vitest'
import { detectFastWrite } from '@/lib/orca/orchestrator/fastWrites'

describe('detectFastWrite — add watchlist', () => {
  const positives = [
    'add BTC to my watchlist',
    'Add btc to watchlist',
    'add $btc to my watchlist',
    'please add ETH to my watchlist',
    'put SOL on my watchlist',
    'track DOGE in my watchlist please',
    'watch LINK in watchlist',
    'follow ARB on watchlist',
    'save MATIC to watchlist',
  ]
  for (const msg of positives) {
    it(`matches: "${msg}"`, () => {
      const got = detectFastWrite(msg)
      expect(got).not.toBeNull()
      expect(got!.confirm.calls).toHaveLength(1)
      expect(got!.confirm.calls[0].tool).toBe('addToWatchlist')
      const ticker = (got!.confirm.calls[0].args as any).ticker
      expect(typeof ticker).toBe('string')
      expect(ticker).toBe(ticker.toUpperCase())
    })
  }

  it('returns uppercase ticker even when input is lowercase', () => {
    const got = detectFastWrite('add btc to my watchlist')
    expect((got!.confirm.calls[0].args as any).ticker).toBe('BTC')
  })

  it('does NOT inject userId (server injects from JWT)', () => {
    const got = detectFastWrite('add SOL to watchlist')
    expect((got!.confirm.calls[0].args as any).userId).toBeUndefined()
  })

  it('does not match when the ticker slot is a pronoun', () => {
    expect(detectFastWrite('add this to my watchlist')).toBeNull()
    expect(detectFastWrite('add it to my watchlist')).toBeNull()
  })
})

describe('detectFastWrite — remove watchlist', () => {
  const positives = [
    'remove BTC from my watchlist',
    'untrack ETH from watchlist',
    'unwatch SOL on my watchlist',
    'drop DOGE from watchlist',
    'delete ARB from my watchlist',
  ]
  for (const msg of positives) {
    it(`matches: "${msg}"`, () => {
      const got = detectFastWrite(msg)
      expect(got).not.toBeNull()
      expect(got!.confirm.calls[0].tool).toBe('removeFromWatchlist')
    })
  }
})

describe('detectFastWrite — negatives (MUST NOT match)', () => {
  const negatives = [
    '',
    'hi',
    'what is BTC',
    'why is ETH up today',
    'show me whale flows for SOL',
    'explain the BTC signal',
    'when should I sell BTC',
    'tell me about my watchlist',
    'add a note to my profile',
    'watch out for BTC volatility',
    'I want to add BTC eventually',
    // not about watchlist:
    'add BTC alerts',
    'add BTC',
  ]
  for (const msg of negatives) {
    it(`does not match: "${msg}"`, () => {
      expect(detectFastWrite(msg)).toBeNull()
    })
  }

  it('returns null for non-string input', () => {
    expect(detectFastWrite(undefined as any)).toBeNull()
    expect(detectFastWrite(null as any)).toBeNull()
    expect(detectFastWrite(42 as any)).toBeNull()
  })

  it('returns null for absurdly long inputs', () => {
    const huge = 'add BTC to my watchlist ' + 'x'.repeat(500)
    expect(detectFastWrite(huge)).toBeNull()
  })
})

describe('detectFastWrite — prose shape', () => {
  it('emits non-emoji prose mentioning reversibility for add', () => {
    const got = detectFastWrite('add BTC to watchlist')!
    expect(got.prose).toMatch(/BTC/)
    expect(got.prose).toMatch(/Confirm/)
    expect(got.prose).toMatch(/reversible/i)
    // House rule §3.5.2: no emojis.
    expect(got.prose).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })

  it('emits a confirm label suitable for an aria-label', () => {
    const got = detectFastWrite('add eth to my watchlist')!
    expect(got.confirm.label).toBe('Add ETH to watchlist')
  })
})
