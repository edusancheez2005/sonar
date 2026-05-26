import { describe, it, expect } from 'vitest'
import { detectFastWrite, sanitiseConfirmCalls } from '@/lib/orca/orchestrator/fastWrites'

describe('detectFastWrite — add patterns', () => {
  it('detects "add SOL to my watchlist"', () => {
    expect(detectFastWrite('add SOL to my watchlist')).toEqual({
      calls: [{ tool: 'addToWatchlist', args: { ticker: 'SOL' } }],
      label: 'Add SOL to your watchlist?',
    })
  })

  it('is case-insensitive on the verb and uppercases the ticker', () => {
    expect(detectFastWrite('Add sol')).toEqual({
      calls: [{ tool: 'addToWatchlist', args: { ticker: 'SOL' } }],
      label: 'Add SOL to your watchlist?',
    })
  })

  it('handles "watch BTC"', () => {
    expect(detectFastWrite('watch BTC')).toEqual({
      calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }],
      label: 'Add BTC to your watchlist?',
    })
  })

  it('handles "track $WBTC please"', () => {
    expect(detectFastWrite('track $WBTC please')).toEqual({
      calls: [{ tool: 'addToWatchlist', args: { ticker: 'WBTC' } }],
      label: 'Add WBTC to your watchlist?',
    })
  })

  it('handles a generic verb only when watchlist is mentioned', () => {
    expect(detectFastWrite('save ETH to watchlist')).toEqual({
      calls: [{ tool: 'addToWatchlist', args: { ticker: 'ETH' } }],
      label: 'Add ETH to your watchlist?',
    })
  })

  it('rejects a generic verb without explicit watchlist context', () => {
    expect(detectFastWrite('save my work')).toBeNull()
    expect(detectFastWrite('put it on hold')).toBeNull()
    expect(detectFastWrite('pin this for me')).toBeNull()
  })

  it('rejects "add a feature"', () => {
    expect(detectFastWrite('add a feature')).toBeNull()
  })

  it('rejects "add my notes"', () => {
    expect(detectFastWrite('add my notes')).toBeNull()
  })
})

describe('detectFastWrite — remove patterns', () => {
  it('detects "remove BTC from my watchlist"', () => {
    expect(detectFastWrite('remove BTC from my watchlist')).toEqual({
      calls: [{ tool: 'removeFromWatchlist', args: { ticker: 'BTC' } }],
      label: 'Remove BTC from your watchlist?',
    })
  })

  it('handles "unwatch DOGE"', () => {
    expect(detectFastWrite('unwatch DOGE')).toEqual({
      calls: [{ tool: 'removeFromWatchlist', args: { ticker: 'DOGE' } }],
      label: 'Remove DOGE from your watchlist?',
    })
  })

  it('handles "stop watching SOL"', () => {
    expect(detectFastWrite('stop watching SOL')).toEqual({
      calls: [{ tool: 'removeFromWatchlist', args: { ticker: 'SOL' } }],
      label: 'Remove SOL from your watchlist?',
    })
  })

  it('handles "unadd ETH" and "can you unadd eth from my watchlist"', () => {
    expect(detectFastWrite('unadd ETH')).toEqual({
      calls: [{ tool: 'removeFromWatchlist', args: { ticker: 'ETH' } }],
      label: 'Remove ETH from your watchlist?',
    })
    expect(detectFastWrite('can you unadd eth from my watchlist')).toEqual({
      calls: [{ tool: 'removeFromWatchlist', args: { ticker: 'ETH' } }],
      label: 'Remove ETH from your watchlist?',
    })
  })

  it('rejects "remove this"', () => {
    expect(detectFastWrite('remove this')).toBeNull()
  })

  it('rejects "remove that alert"', () => {
    // first token after the verb is "that", a stopword
    expect(detectFastWrite('remove that alert')).toBeNull()
  })
})

describe('detectFastWrite — non-matches', () => {
  it('returns null for empty / whitespace input', () => {
    expect(detectFastWrite('')).toBeNull()
    expect(detectFastWrite('   ')).toBeNull()
  })

  it('returns null for non-strings', () => {
    // @ts-expect-error testing runtime guard
    expect(detectFastWrite(null)).toBeNull()
    // @ts-expect-error testing runtime guard
    expect(detectFastWrite(42)).toBeNull()
  })

  it('returns null for long messages (likely not a one-shot write)', () => {
    expect(detectFastWrite('add BTC to my watchlist '.repeat(20))).toBeNull()
  })

  it('returns null for "tell me about SOL"', () => {
    expect(detectFastWrite('tell me about SOL')).toBeNull()
  })

  it('rejects malformed tickers', () => {
    expect(detectFastWrite('add TOOLONGTICKER123 to watchlist')).toBeNull()
    expect(detectFastWrite('add bad<tag>')).toBeNull()
  })
})

describe('sanitiseConfirmCalls', () => {
  it('returns null for non-arrays', () => {
    expect(sanitiseConfirmCalls(null)).toBeNull()
    expect(sanitiseConfirmCalls({})).toBeNull()
    expect(sanitiseConfirmCalls('add BTC')).toBeNull()
  })

  it('strips unknown tools', () => {
    expect(
      sanitiseConfirmCalls([
        { tool: 'rm -rf', args: { ticker: 'BTC' } },
        { tool: 'addToWatchlist', args: { ticker: 'btc' } },
      ])
    ).toEqual([{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }])
  })

  it('rejects bad ticker shapes', () => {
    expect(
      sanitiseConfirmCalls([
        { tool: 'addToWatchlist', args: { ticker: 'NOT A TICKER' } },
        { tool: 'removeFromWatchlist', args: { ticker: '<svg/>' } },
      ])
    ).toBeNull()
  })

  it('caps the result at 4 calls', () => {
    const input = Array.from({ length: 10 }, (_, i) => ({
      tool: 'addToWatchlist',
      args: { ticker: `T${i}` },
    }))
    const out = sanitiseConfirmCalls(input)
    expect(out).toHaveLength(4)
  })

  it('returns a clean list for legit input', () => {
    expect(
      sanitiseConfirmCalls([
        { tool: 'addToWatchlist', args: { ticker: 'sol' } },
        { tool: 'removeFromWatchlist', args: { ticker: 'ETH' } },
      ])
    ).toEqual([
      { tool: 'addToWatchlist', args: { ticker: 'SOL' } },
      { tool: 'removeFromWatchlist', args: { ticker: 'ETH' } },
    ])
  })
})
