import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import FilteredSignalsPanel from '@/components/personal/FilteredSignalsPanel'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

const sampleItems = [
  {
    id: 101,
    token: 'SOL',
    signal: 'STRONG BUY',
    score: 88,
    confidence: 90,
    timeframe: '3d',
    price_at_signal: 142,
    computed_at: '2026-06-01T00:00:00Z',
    match_reason: 'STRONG BUY with 90% confidence on the 3d timeframe — matches your conservative risk profile, swing-trading horizon.',
  },
  {
    id: 102,
    token: 'BTC',
    signal: 'STRONG SELL',
    score: 18,
    confidence: 82,
    timeframe: '7d',
    price_at_signal: 60000,
    computed_at: '2026-06-01T00:00:00Z',
    match_reason: 'STRONG SELL with 82% confidence on the 7d timeframe — matches your conservative risk profile.',
  },
]

describe('FilteredSignalsPanel', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows the unauth state when no session', async () => {
    const fetchImpl = vi.fn()
    render(<FilteredSignalsPanel client={makeClient(null)} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(
        screen.getByText(/sign in to see signals tuned/i),
      ).toBeInTheDocument()
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('shows a tailored empty-state message for conservative users', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        profile_applied: { risk_tolerance: 'conservative', time_horizon: 'swing' },
        fetched_at: 'now',
      }),
    })
    render(<FilteredSignalsPanel client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(
        screen.getByText(/no high-conviction signals/i),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/STRONG BUY \/ STRONG SELL/)).toBeInTheDocument()
  })

  it('shows the no-tickers message when empty_reason is no_tickers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        profile_applied: { risk_tolerance: 'balanced', time_horizon: 'swing' },
        empty_reason: 'no_tickers',
        fetched_at: 'now',
      }),
    })
    render(<FilteredSignalsPanel client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(
        screen.getByText(/add tickers from any token page/i),
      ).toBeInTheDocument()
    })
  })

  it('renders one row per signal with the right confidence and link', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: sampleItems,
        profile_applied: { risk_tolerance: 'conservative', time_horizon: 'swing' },
        fetched_at: 'now',
      }),
    })
    render(<FilteredSignalsPanel client={makeClient('tok')} fetchImpl={fetchImpl} />)
    const rows = await screen.findAllByTestId('signal-row')
    expect(rows).toHaveLength(2)
    expect(screen.getByText('SOL').getAttribute('href')).toBe('/token/sol')
    expect(screen.getByText('BTC').getAttribute('href')).toBe('/token/btc')
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('STRONG BUY')).toBeInTheDocument()
    expect(screen.getByText('STRONG SELL')).toBeInTheDocument()
  })

  it('sends bearer token to /api/personal/signals', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], profile_applied: null, fetched_at: 'now' }),
    })
    render(<FilteredSignalsPanel client={makeClient('mytok')} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledWith(
        '/api/personal/signals',
        expect.objectContaining({
          headers: expect.objectContaining({ authorization: 'Bearer mytok' }),
        }),
      )
    })
  })

  it('shows an error banner on non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    render(<FilteredSignalsPanel client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load signals/i)
    })
  })

  it('always shows the research-only footnote', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], profile_applied: null, fetched_at: 'now' }),
    })
    render(<FilteredSignalsPanel client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(
        screen.getByText(/never tells you whether to buy or sell/i),
      ).toBeInTheDocument()
    })
  })
})
