import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import WatchlistPanel from '@/components/personal/WatchlistPanel'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

describe('WatchlistPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the unauth state when there is no session', async () => {
    const client = makeClient(null)
    const fetchImpl = vi.fn()
    render(<WatchlistPanel client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/sign in to see your personal watchlist/i)).toBeInTheDocument()
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('shows the empty-state copy when the API returns no items', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], fetched_at: 'now' }),
    })
    render(<WatchlistPanel client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/add tickers from any token page/i)).toBeInTheDocument()
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/personal/watchlist',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer tok' }),
      })
    )
  })

  it('renders one card per ticker with link to token page', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            ticker: 'BTC',
            source: 'holding',
            price_usd: 60000,
            change_24h: 1.5,
            change_7d: -2,
            net_flow_24h_usd: 1_000_000,
            net_flow_direction: 'up',
            latest_headline: 'BTC hits new local high',
          },
          {
            ticker: 'SOL',
            source: 'watchlist',
            price_usd: null,
            change_24h: null,
            change_7d: null,
            net_flow_24h_usd: null,
            net_flow_direction: null,
            latest_headline: null,
          },
        ],
        fetched_at: 'now',
      }),
    })
    render(<WatchlistPanel client={client} fetchImpl={fetchImpl} />)
    const btcCard = await screen.findByTestId('watchlist-card-BTC')
    expect(btcCard.getAttribute('href')).toBe('/token/btc')
    expect(btcCard.textContent).toContain('BTC hits new local high')
    expect(btcCard.textContent).toMatch(/\$60[,.]?000/)

    const solCard = await screen.findByTestId('watchlist-card-SOL')
    // missing price renders an em-dash
    expect(solCard.textContent).toContain('—')
  })

  it('shows an error message when the API call fails', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    render(<WatchlistPanel client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/could not load watchlist/i)).toBeInTheDocument()
    })
  })

  it('contains no emoji characters in any rendered branch', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], fetched_at: 'now' }),
    })
    const { container } = render(<WatchlistPanel client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/add tickers/i)).toBeInTheDocument()
    })
    expect(/\p{Extended_Pictographic}/u.test(container.textContent || '')).toBe(false)
  })
})
