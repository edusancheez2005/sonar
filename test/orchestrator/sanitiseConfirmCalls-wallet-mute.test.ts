import { describe, it, expect } from 'vitest'
import { sanitiseConfirmCalls } from '@/lib/orca/orchestrator/fastWrites'

const ADDR = '0x515b72Ed8a97F42C568D6A143232775018f133C8'

describe('sanitiseConfirmCalls — wallet tools', () => {
  it('keeps a valid trackWallet call', () => {
    const out = sanitiseConfirmCalls([{ tool: 'trackWallet', args: { address: ADDR, chain: 'bsc' } }])
    expect(out).toEqual([{ tool: 'trackWallet', args: { address: ADDR, chain: 'bsc' } }])
  })

  it('drops a trackWallet call with an invalid chain', () => {
    const out = sanitiseConfirmCalls([{ tool: 'trackWallet', args: { address: ADDR, chain: 'doge' } }])
    expect(out).toBeNull()
  })

  it('drops a trackWallet call with an invalid address charset', () => {
    const out = sanitiseConfirmCalls([{ tool: 'trackWallet', args: { address: 'bad address!!', chain: 'eth' } }])
    expect(out).toBeNull()
  })

  it('keeps a valid untrackWallet call', () => {
    const out = sanitiseConfirmCalls([{ tool: 'untrackWallet', args: { address: ADDR, chain: 'eth' } }])
    expect(out).toEqual([{ tool: 'untrackWallet', args: { address: ADDR, chain: 'eth' } }])
  })
})

describe('sanitiseConfirmCalls — mute tools', () => {
  it('keeps a valid muteTicker call', () => {
    const out = sanitiseConfirmCalls([{ tool: 'muteTicker', args: { ticker: 'btc', minutes: 1440 } }])
    expect(out).toEqual([{ tool: 'muteTicker', args: { ticker: 'BTC', minutes: 1440 } }])
  })

  it('clamps an out-of-range minutes value', () => {
    const out = sanitiseConfirmCalls([{ tool: 'muteTicker', args: { ticker: 'BTC', minutes: 999999 } }])
    expect(out?.[0].args).toMatchObject({ ticker: 'BTC', minutes: 30 * 24 * 60 })
  })

  it('drops a muteTicker call with no ticker', () => {
    const out = sanitiseConfirmCalls([{ tool: 'muteTicker', args: { minutes: 60 } }])
    expect(out).toBeNull()
  })

  it('keeps a valid unmuteTicker call', () => {
    const out = sanitiseConfirmCalls([{ tool: 'unmuteTicker', args: { ticker: 'sol' } }])
    expect(out).toEqual([{ tool: 'unmuteTicker', args: { ticker: 'SOL' } }])
  })
})
