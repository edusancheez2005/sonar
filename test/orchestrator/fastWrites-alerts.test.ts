import { describe, it, expect } from 'vitest'
import { detectFastWrite, detectAlertWrite, sanitiseConfirmCalls } from '@/lib/orca/orchestrator/fastWrites'

describe('detectAlertWrite — create', () => {
  it('detects "alert me when SOL moves 5%"', () => {
    const r = detectAlertWrite('alert me when SOL moves 5%')
    expect(r?.calls[0].tool).toBe('createAlert')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL', kind: 'price_move', threshold_pct: 5 })
  })

  it('defaults price move to 5% when no number given', () => {
    const r = detectAlertWrite('notify me when BTC price moves')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'BTC', kind: 'price_move', threshold_pct: 5 })
  })

  it('detects a whale-flow alert with a USD threshold', () => {
    const r = detectAlertWrite('ping me on ETH whale flow over $2M')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'ETH', kind: 'whale_flow', threshold_usd: 2_000_000 })
  })

  it('detects a signal-change alert', () => {
    const r = detectAlertWrite('tell me when the SOL signal flips')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL', kind: 'signal_flip' })
  })

  it('detects a high-impact news alert', () => {
    const r = detectAlertWrite('warn me about big SOL news')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL', kind: 'news_high_impact' })
  })

  it('uses the context ticker when none is in the message', () => {
    const r = detectAlertWrite('alert me when it moves 8%', { contextTicker: 'AVAX' })
    expect(r?.calls[0].args).toMatchObject({ ticker: 'AVAX', kind: 'price_move', threshold_pct: 8 })
  })
})

describe('detectAlertWrite — list / remove', () => {
  it('detects "show my alerts"', () => {
    const r = detectAlertWrite('show my alerts')
    expect(r?.calls[0].tool).toBe('listAlerts')
  })

  it('detects "remove my SOL alert"', () => {
    const r = detectAlertWrite('remove my SOL alert')
    expect(r?.calls[0].tool).toBe('removeAlert')
    expect(r?.calls[0].args).toMatchObject({ ticker: 'SOL' })
  })

  it('returns null when remove has no ticker', () => {
    expect(detectAlertWrite('delete my alert')).toBeNull()
  })
})

describe('detectAlertWrite — negatives', () => {
  it('ignores non-alert messages', () => {
    expect(detectAlertWrite('what is SOL doing')).toBeNull()
    expect(detectAlertWrite('add SOL to my watchlist')).toBeNull()
  })
})

describe('detectFastWrite wires alerts first', () => {
  it('routes an alert command to createAlert, not the watchlist', () => {
    const r = detectFastWrite('alert me when SOL moves 5%')
    expect(r?.calls[0].tool).toBe('createAlert')
  })
})

describe('sanitiseConfirmCalls — alert tools', () => {
  it('keeps a valid createAlert call', () => {
    const out = sanitiseConfirmCalls([
      { tool: 'createAlert', args: { ticker: 'sol', kind: 'price_move', threshold_pct: 5 } },
    ])
    expect(out![0]).toMatchObject({ tool: 'createAlert', args: { ticker: 'SOL', kind: 'price_move' } })
  })

  it('drops a createAlert with an invalid kind', () => {
    const out = sanitiseConfirmCalls([
      { tool: 'createAlert', args: { ticker: 'SOL', kind: 'nonsense' } },
    ])
    expect(out).toBeNull()
  })

  it('keeps listAlerts with no args', () => {
    const out = sanitiseConfirmCalls([{ tool: 'listAlerts', args: {} }])
    expect(out![0].tool).toBe('listAlerts')
  })
})
