import { describe, it, expect } from 'vitest'
import { deriveFocus } from '@/components/orca/useOrcaContext'

describe('useOrcaContext.deriveFocus', () => {
  it('returns null for empty or root path', () => {
    expect(deriveFocus('')).toBeNull()
    expect(deriveFocus('/')).toBeNull()
  })

  it('returns null for unknown segments', () => {
    expect(deriveFocus('/some/random/path')).toBeNull()
  })

  it('extracts a ticker focus from /token/<symbol>', () => {
    expect(deriveFocus('/token/btc')).toEqual({
      type: 'ticker',
      value: 'BTC',
      label: '$BTC',
    })
    expect(deriveFocus('/token/ETH/')).toEqual({
      type: 'ticker',
      value: 'ETH',
      label: '$ETH',
    })
  })

  it('rejects non-ticker shaped values on /token/', () => {
    expect(deriveFocus('/token/not-a-ticker-too-long')).toBeNull()
  })

  it('extracts a list focus from /tokens, /trending, /news, /watchlist', () => {
    expect(deriveFocus('/tokens')).toMatchObject({ type: 'list', value: 'tokens' })
    expect(deriveFocus('/trending')).toMatchObject({ type: 'list', value: 'trending' })
    expect(deriveFocus('/news')).toMatchObject({ type: 'list', value: 'news' })
    expect(deriveFocus('/watchlist')).toMatchObject({ type: 'list', value: 'watchlist' })
  })

  it('extracts a wallet focus from /wallet/<addr>', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    const focus = deriveFocus(`/wallet/${addr}`)
    expect(focus).toMatchObject({ type: 'wallet', value: addr })
    expect(focus?.label).toMatch(/0x1234.{1,3}5678/)
  })

  it('extracts a tx focus from /tx/<hash>', () => {
    const hash = '0xabcdef0123456789abcdef0123456789abcdef01'
    const focus = deriveFocus(`/tx/${hash}`)
    expect(focus).toMatchObject({ type: 'tx', value: hash })
    expect(focus?.label).toMatch(/^tx /)
  })

  it('returns a whales list focus for /whales and /whale-tracker', () => {
    expect(deriveFocus('/whales')).toMatchObject({ type: 'list', value: 'whales' })
    expect(deriveFocus('/whale-tracker')).toMatchObject({ type: 'list', value: 'whales' })
  })

  it('returns a personal list focus for /dashboard/personal', () => {
    expect(deriveFocus('/dashboard/personal')).toMatchObject({
      type: 'list',
      value: 'personal',
    })
  })

  it('strips query strings and hashes before parsing', () => {
    expect(deriveFocus('/token/btc?utm=email#price')).toMatchObject({
      type: 'ticker',
      value: 'BTC',
    })
  })
})
