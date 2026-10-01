import { describe, it, expect } from 'vitest'
import { detectFastWrite, detectUnsupportedAlertAsk } from '../../lib/orca/orchestrator/fastWrites'

describe('alert quick-writes', () => {
  it('still sets real per-token alerts', () => {
    const d = detectFastWrite('alert me when SOL moves 5%')
    expect(d?.calls[0]).toEqual({ tool: 'createAlert', args: { ticker: 'SOL', kind: 'price_move', threshold_pct: 5 } })
    const w = detectFastWrite('notify me about BTC whale flow over $2M')
    expect(w?.calls[0].args).toMatchObject({ ticker: 'BTC', kind: 'whale_flow', threshold_usd: 2_000_000 })
  })

  it('never mints a ticker out of an English word', () => {
    expect(detectFastWrite('alert me when the market dumps')).toBeNull()
    expect(detectFastWrite('tell me when tracked wallets move')).toBeNull()
  })

  it('sets a whale_convergence alert from natural phrasing', () => {
    const d = detectFastWrite('tell me when 3+ tracked whales buy the same token')
    expect(d?.calls[0]).toEqual({ tool: 'createAlert', args: { ticker: '_ALL_', kind: 'whale_convergence', threshold_pct: 3 } })
    expect(d?.label).toMatch(/3\+ different whales buy the same token/)
    const d2 = detectFastWrite('no, i meant tell me when 3+ tracked whales buy the same token')
    expect(d2?.calls[0].args).toMatchObject({ kind: 'whale_convergence', threshold_pct: 3 })
    const d3 = detectFastWrite('alert me if 5 different whales buy SOL')
    expect(d3?.calls[0].args).toEqual({ ticker: 'SOL', kind: 'whale_convergence', threshold_pct: 5 })
    expect(detectUnsupportedAlertAsk('tell me when 3+ tracked whales buy the same token')).toBeNull()
  })

  it('answers unsupported alert asks instead of guessing', () => {
    expect(detectUnsupportedAlertAsk('alert me when it dumps')).toMatch(/^Which token should I watch/)
    expect(detectUnsupportedAlertAsk('alert me when SOL moves 5%')).toBeNull()
    expect(detectUnsupportedAlertAsk('tell me about SOL whales')).toBeNull()
    expect(detectUnsupportedAlertAsk('what are whales doing today?')).toBeNull()
  })
})
