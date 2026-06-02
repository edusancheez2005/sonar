import { describe, it, expect } from 'vitest'
import { detectWalletWrite, detectFastWrite } from '@/lib/orca/orchestrator/fastWrites'

const ADDR = '0x515b72Ed8a97F42C568D6A143232775018f133C8'

describe('detectWalletWrite — track', () => {
  it('detects "track wallet 0x… on bsc"', () => {
    const r = detectWalletWrite(`track wallet ${ADDR} on bsc`)
    expect(r?.calls[0].tool).toBe('trackWallet')
    expect(r?.calls[0].args).toMatchObject({ address: ADDR, chain: 'bsc' })
  })

  it('defaults an EVM address to eth when no chain hint', () => {
    const r = detectWalletWrite(`watch ${ADDR}`)
    expect(r?.calls[0].tool).toBe('trackWallet')
    expect(r?.calls[0].args).toMatchObject({ address: ADDR, chain: 'eth' })
  })

  it('honours a chain hint ("on base")', () => {
    const r = detectWalletWrite(`monitor ${ADDR} on base`)
    expect(r?.calls[0].args).toMatchObject({ chain: 'base' })
  })

  it('tracks a Tron address', () => {
    const r = detectWalletWrite('follow TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
    expect(r?.calls[0].args).toMatchObject({ chain: 'tron' })
  })

  it('uses the pronoun fallback with a contextAddress', () => {
    const r = detectWalletWrite('track this wallet', {
      contextAddress: { address: ADDR, chain: 'arb' },
    })
    expect(r?.calls[0].tool).toBe('trackWallet')
    expect(r?.calls[0].args).toMatchObject({ address: ADDR, chain: 'arb' })
  })

  it('returns null for "track this wallet" with no context address', () => {
    expect(detectWalletWrite('track this wallet')).toBeNull()
  })

  it('returns null when no address is present (e.g. "track SOL")', () => {
    expect(detectWalletWrite('track SOL')).toBeNull()
  })
})

describe('detectWalletWrite — untrack', () => {
  it('detects "untrack 0x…"', () => {
    const r = detectWalletWrite(`untrack ${ADDR}`)
    expect(r?.calls[0].tool).toBe('untrackWallet')
    expect(r?.calls[0].args).toMatchObject({ address: ADDR })
  })

  it('detects "stop tracking 0x…"', () => {
    const r = detectWalletWrite(`stop tracking ${ADDR} on polygon`)
    expect(r?.calls[0].tool).toBe('untrackWallet')
    expect(r?.calls[0].args).toMatchObject({ chain: 'polygon' })
  })

  it('untracks via pronoun fallback with a contextAddress', () => {
    const r = detectWalletWrite('untrack that wallet', {
      contextAddress: { address: ADDR, chain: 'eth' },
    })
    expect(r?.calls[0].tool).toBe('untrackWallet')
    expect(r?.calls[0].args).toMatchObject({ address: ADDR })
  })
})

describe('detectFastWrite — wallet routing', () => {
  it('routes "track 0x…" to a wallet write, not a watchlist add', () => {
    const r = detectFastWrite(`track ${ADDR}`)
    expect(r?.calls[0].tool).toBe('trackWallet')
  })
})
