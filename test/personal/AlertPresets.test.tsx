import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import AlertPresetsJs from '@/components/personal/AlertPresets'
import { describeRule, presetBody, ALERT_PRESETS, visiblePresets, CADENCE_SENTENCE } from '@/lib/orca/alerts/presets'

const token = async () => 'tok'
// A JS component: its props are inferred from defaults, so type it loosely.
const AlertPresets = AlertPresetsJs as any

describe('AlertPresets', () => {
  let fetchMock: any
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('saves a price preset in three clicks with the coin and threshold prefilled', async () => {
    const onSaved = vi.fn()
    render(<AlertPresets token={token} coins={['LINK']} onSaved={onSaved} />)
    await userEvent.click(screen.getByTestId('alert-preset-price_move'))
    await userEvent.click(screen.getByTestId('alert-preset-option-10'))
    await userEvent.click(screen.getByTestId('alert-preset-save'))
    const call = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/personal/alerts')
    expect(JSON.parse(call[1].body)).toEqual({ kind: 'price_move', source: 'alert_preset', ticker: 'LINK', threshold_pct: 10 })
    expect(call[1].headers.Authorization).toBe('Bearer tok')
    await waitFor(() => expect(screen.getByTestId('alert-preset-status').textContent).toMatch(/^Saved\. First check within 5 minutes\. Delivered to your bell\.$/))
    expect(onSaved).toHaveBeenCalledWith({ kind: 'price_move' })
  })

  it('offers BTC, ETH and SOL when the user watches no coin', async () => {
    render(<AlertPresets token={token} />)
    await userEvent.click(screen.getByTestId('alert-preset-whale_flow'))
    for (const s of ['BTC', 'ETH', 'SOL']) expect(screen.getByTestId(`alert-preset-chip-${s}`)).toBeTruthy()
  })

  it('follows and alerts a famous wallet in one call when the user follows none', async () => {
    render(<AlertPresets token={token} emailOn />)
    await userEvent.click(screen.getByTestId('alert-preset-wallet_activity'))
    await userEvent.click(screen.getByTestId('alert-preset-chip-binance'))
    await userEvent.click(screen.getByTestId('alert-preset-save'))
    const call = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/onboarding/follow-famous')
    expect(JSON.parse(call[1].body)).toEqual({ slugs: ['binance'], source: 'alert_preset' })
    await waitFor(() => expect(screen.getByTestId('alert-preset-status').textContent).toMatch(/up to an hour.*bell and to your email/))
  })

  it('uses a followed wallet and the chosen floor', async () => {
    render(<AlertPresets token={token} wallets={[{ address: '0xabc', name: 'Wintermute', avatar: null }]} />)
    await userEvent.click(screen.getByTestId('alert-preset-wallet_activity'))
    await userEvent.click(screen.getByTestId('alert-preset-option-1000000'))
    await userEvent.click(screen.getByTestId('alert-preset-save'))
    const call = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/personal/alerts')
    expect(JSON.parse(call[1].body)).toMatchObject({ kind: 'wallet_activity', address: '0xabc', threshold_usd: 1000000 })
  })

  it('shows the server refusal', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'rule_limit_reached' }) })
    render(<AlertPresets token={token} />)
    await userEvent.click(screen.getByTestId('alert-preset-news_high_impact'))
    await userEvent.click(screen.getByTestId('alert-preset-save'))
    await waitFor(() => expect(screen.getByTestId('alert-preset-status').textContent).toMatch(/50-alert limit/))
  })
})

describe('presets library', () => {
  it('offers whale convergence now that its migration has run', () => {
    expect(visiblePresets().map((p) => p.kind)).toContain('whale_convergence')
  })
  it('builds request bodies per unit', () => {
    const flow = ALERT_PRESETS.find((p) => p.kind === 'whale_flow')!
    expect(presetBody(flow, { ticker: 'ETH' })).toEqual({ kind: 'whale_flow', source: 'alert_preset', ticker: 'ETH', threshold_usd: 5_000_000 })
  })
  it('describes every kind in one plain sentence, without advice verbs', () => {
    const names = new Map([['0xabc', 'Wintermute']])
    expect(describeRule({ kind: 'price_move', ticker: 'SOL', threshold_pct: 5 })).toBe('SOL moves 5% in an hour')
    expect(describeRule({ kind: 'wallet_activity', address: '0xABC', threshold_usd: 1e6 }, names)).toBe('Wintermute moves more than $1M')
    expect(describeRule({ kind: 'wallet_activity', address: '0x1234567890' })).toBe('0x1234…7890 makes any valued move')
    expect(describeRule({ kind: 'whale_flow', ticker: 'BTC', threshold_usd: 5e6 })).toBe('Whale net flow on BTC crosses $5M in 24 h')
    for (const kind of ['news_high_impact', 'news_any', 'social_post', 'signal_flip', 'whale_convergence']) {
      expect(describeRule({ kind, ticker: 'ETH' })).not.toMatch(/\b(buy|sell|hold|should)\b/i)
    }
    expect(CADENCE_SENTENCE).toMatch(/every 5 minutes/)
  })
})
