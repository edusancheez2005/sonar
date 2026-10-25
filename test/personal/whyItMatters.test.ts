import { describe, it, expect } from 'vitest'
import { whyItMatters } from '@/lib/personal/whyItMatters'

describe('whyItMatters', () => {
  it('calls a deposit-to-hot-wallet move a routine sweep', () => {
    expect(whyItMatters({ from_label: 'Binance Deposit', to_label: 'Binance Hot Wallet' })).toMatch(/housekeeping/)
  })
  it('calls cold to hot a refill', () => {
    expect(whyItMatters({ from_label: 'Coinbase Cold Wallet', to_label: 'Coinbase Hot Wallet' })).toMatch(/refilling/)
  })
  it('says exchange-to-exchange moves are not trades', () => {
    expect(whyItMatters({ from_label: 'Binance 14', to_label: 'Binance 8' })).toMatch(/not a trade/)
  })
  it('separates deposits to and withdrawals from an exchange', () => {
    expect(whyItMatters({ from_label: 'Wintermute', to_label: 'Kraken' })).toMatch(/about to be traded/)
    expect(whyItMatters({ from_label: 'OKX', to_label: null })).toMatch(/withdrawal/)
  })
  it('sizes moves by followed wallets', () => {
    expect(whyItMatters({ isFollowedWallet: true, usd: 2_500_000 })).toMatch(/seven-figure/)
    expect(whyItMatters({ isFollowedWallet: true, usd: 40_000 })).toMatch(/chose to watch/)
  })
  it('never gives advice', () => {
    const lines = [
      whyItMatters({}),
      whyItMatters({ to_label: 'Binance' }),
      whyItMatters({ isFollowedWallet: true, usd: 5e6 }),
    ]
    for (const l of lines) expect(l).not.toMatch(/\b(buy|sell|hold)\b/i)
  })
})
