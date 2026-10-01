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
    expect(detectFastWrite('tell me when 3+ tracked whales buy the same token')).toBeNull()
    expect(detectFastWrite('no, i meant tell me when 3+ tracked whales buy the same token')).toBeNull()
    expect(detectFastWrite('alert me when the market dumps')).toBeNull()
  })

  it('answers unsupported alert asks instead of guessing', () => {
    const t = detectUnsupportedAlertAsk('tell me when 3+ tracked whales buy the same token')
    expect(t).toMatch(/aren't available/)
    expect(t).toMatch(/Which token/)
    expect(detectUnsupportedAlertAsk('no, i meant tell me when 3+ tracked whales buy the same token')).toMatch(/aren't available/)
    expect(detectUnsupportedAlertAsk('alert me when it dumps')).toMatch(/^Which token should I watch/)
    expect(detectUnsupportedAlertAsk('alert me when SOL moves 5%')).toBeNull()
    expect(detectUnsupportedAlertAsk('tell me about SOL whales')).toBeNull()
    expect(detectUnsupportedAlertAsk('what are whales doing today?')).toBeNull()
  })
})
