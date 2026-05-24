import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import PulseStrip from '@/components/personal/PulseStrip'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

describe('PulseStrip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all four tiles with empty states when watchlist is empty', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByTestId('pulse-strip')).toBeInTheDocument()
    })
    expect(screen.getByTestId('pulse-tile-movers')).toBeInTheDocument()
    expect(screen.getByTestId('pulse-tile-whales')).toBeInTheDocument()
    expect(screen.getByTestId('pulse-tile-news')).toBeInTheDocument()
    expect(screen.getByTestId('pulse-tile-macro')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/no movers/i)).toBeInTheDocument()
    })
  })

  it('shows the unauth message in tiles when session is missing', async () => {
    const client = makeClient(null)
    const fetchImpl = vi.fn()
    render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/sign in to see your movers/i)).toBeInTheDocument()
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('renders movers sorted by absolute 24h move', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { ticker: 'BTC', change_24h: 0.5, net_flow_direction: 'flat' },
          { ticker: 'ETH', change_24h: -8.4, net_flow_direction: 'down', latest_headline: 'ETH news' },
          { ticker: 'SOL', change_24h: 12.1, net_flow_direction: 'up' },
        ],
      }),
    })
    render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByTestId('pulse-tile-movers').textContent).toContain('SOL')
    })
    const movers = screen.getByTestId('pulse-tile-movers').textContent || ''
    const solIdx = movers.indexOf('SOL')
    const ethIdx = movers.indexOf('ETH')
    const btcIdx = movers.indexOf('BTC')
    expect(solIdx).toBeGreaterThanOrEqual(0)
    expect(solIdx).toBeLessThan(ethIdx)
    expect(ethIdx).toBeLessThan(btcIdx)
  })

  it('whale tile filters out flat direction', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { ticker: 'BTC', change_24h: 0, net_flow_direction: 'flat' },
          { ticker: 'ETH', change_24h: 0, net_flow_direction: 'down' },
        ],
      }),
    })
    render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      const tile = screen.getByTestId('pulse-tile-whales').textContent || ''
      expect(tile).toContain('ETH')
      expect(tile).not.toContain('BTC')
    })
  })

  it('macro tile renders the default copy when no macroText prop is set', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByTestId('pulse-tile-macro').textContent || '').toMatch(/macro/i)
    })
  })

  it('contains no buy/sell/hold verbs anywhere in the strip', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { ticker: 'BTC', change_24h: 3, net_flow_direction: 'up', latest_headline: 'BTC steady' },
        ],
      }),
    })
    const { container } = render(<PulseStrip client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByTestId('pulse-strip')).toBeInTheDocument()
    })
    const text = (container.textContent || '').toLowerCase()
    expect(text).not.toMatch(/\b(buy|sell|hold)\b/)
  })
})
