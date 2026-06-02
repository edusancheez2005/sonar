import { describe, it, expect } from 'vitest'
import { detectMuteWrite } from '@/lib/orca/orchestrator/fastWrites'

describe('detectMuteWrite — mute', () => {
  it('mutes a ticker with the default 24h duration', () => {
    const r = detectMuteWrite('mute BTC')
    expect(r?.calls[0].tool).toBe('muteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'BTC', minutes: 1440 })
  })

  it('parses an explicit duration ("for 3 days")', () => {
    const r = detectMuteWrite('mute SOL for 3 days')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL', minutes: 3 * 24 * 60 })
  })

  it('parses hours ("for 2h")', () => {
    const r = detectMuteWrite('mute ETH for 2h')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'ETH', minutes: 120 })
  })

  it('detects the "silence" verb', () => {
    const r = detectMuteWrite('silence ETH')
    expect(r?.calls[0].tool).toBe('muteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'ETH' })
  })

  it('detects "stop alerting me on X"', () => {
    const r = detectMuteWrite('stop alerting me on ETH')
    expect(r?.calls[0].tool).toBe('muteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'ETH' })
  })

  it('uses the context ticker when none is in the message', () => {
    const r = detectMuteWrite('mute it', { contextTicker: 'AVAX' })
    expect(r?.calls[0].args).toMatchObject({ ticker: 'AVAX' })
  })

  it('returns null when no ticker can be resolved', () => {
    expect(detectMuteWrite('mute')).toBeNull()
  })
})

describe('detectMuteWrite — unmute', () => {
  it('detects "unmute BTC"', () => {
    const r = detectMuteWrite('unmute BTC')
    expect(r?.calls[0].tool).toBe('unmuteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'BTC' })
  })

  it('detects "resume alerts for SOL"', () => {
    const r = detectMuteWrite('resume alerts for SOL')
    expect(r?.calls[0].tool).toBe('unmuteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL' })
  })

  it('uses the context ticker for a bare "unmute"', () => {
    const r = detectMuteWrite('unmute', { contextTicker: 'DOGE' })
    expect(r?.calls[0].tool).toBe('unmuteTicker')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'DOGE' })
  })
})
