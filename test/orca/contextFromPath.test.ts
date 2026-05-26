/**
 * contextFromPath unit tests (Stage D, 2026-05-26).
 */
import { describe, it, expect } from 'vitest'
import { contextFromPath, shouldShowDrawer } from '../../lib/orca/contextFromPath'

describe('contextFromPath', () => {
  it('returns empty for null / undefined / empty', () => {
    expect(contextFromPath(null)).toEqual({})
    expect(contextFromPath(undefined)).toEqual({})
    expect(contextFromPath('')).toEqual({})
  })

  it('extracts ticker from /token/<symbol>', () => {
    expect(contextFromPath('/token/BTC')).toEqual({ ticker: 'BTC' })
    expect(contextFromPath('/token/eth')).toEqual({ ticker: 'ETH' })
    expect(contextFromPath('/token/sol?sinceHours=24')).toEqual({ ticker: 'SOL' })
    expect(contextFromPath('/tokens/USDC')).toEqual({ ticker: 'USDC' })
  })

  it('strips leading $ from ticker segment', () => {
    expect(contextFromPath('/token/$DOGE')).toEqual({ ticker: 'DOGE' })
  })

  it('extracts wallet from /whale/<addr>', () => {
    const evm = '0x28C6c06298d514Db089934071355E5743bf21d60'
    expect(contextFromPath(`/whale/${evm}`)).toEqual({ wallet: evm })
    expect(contextFromPath(`/whales/${evm}`)).toEqual({ wallet: evm })
    expect(contextFromPath(`/wallet-tracker/${evm}`)).toEqual({ wallet: evm })
  })

  it('extracts Solana base58 wallet', () => {
    const sol = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9'
    expect(contextFromPath(`/whale/${sol}`)).toEqual({ wallet: sol })
  })

  it('ignores wallet segment that is not a valid address', () => {
    expect(contextFromPath('/whale/not-an-address')).toEqual({})
  })

  it('returns empty for unrelated routes', () => {
    expect(contextFromPath('/dashboard')).toEqual({})
    expect(contextFromPath('/news')).toEqual({})
    expect(contextFromPath('/blog/some-post')).toEqual({})
  })
})

describe('shouldShowDrawer', () => {
  it('hides on landing, ai, ai-advisor, auth, legal/privacy/terms', () => {
    for (const p of ['/', '/ai', '/ai/', '/ai-advisor', '/auth', '/auth/signin', '/legal', '/privacy', '/terms']) {
      expect(shouldShowDrawer(p), `expected hide for ${p}`).toBe(false)
    }
  })

  it('shows on dashboard, token, whale, news, blog', () => {
    for (const p of ['/dashboard', '/token/BTC', '/whale/0xabc', '/news', '/blog/some-post', '/whales']) {
      expect(shouldShowDrawer(p), `expected show for ${p}`).toBe(true)
    }
  })

  it('returns false for empty / null', () => {
    expect(shouldShowDrawer(null)).toBe(false)
    expect(shouldShowDrawer('')).toBe(false)
  })
})
