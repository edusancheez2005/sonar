import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import WatchlistTab from '@/components/personal/WatchlistTab'

function makeClient(token: string | null = 'tok') {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

function okResponse(body: any) {
  return { ok: true, status: 200, json: async () => body }
}

describe('WatchlistTab', () => {
  it('refetches when window dispatches orca:watchlist-changed', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ items: [] }))
      .mockResolvedValueOnce(
        okResponse({
          items: [{ ticker: 'SOL', source: 'watchlist', pct_1h: 0.5, pct_24h: 1.2, pct_7d: 3.4, whale_direction: 'up' }],
        })
      )

    render(<WatchlistTab client={makeClient('tok')} fetchImpl={fetchImpl as any} />)

    // First load — empty state surfaces.
    await waitFor(() => {
      expect(screen.getByText(/Add tickers from any token page/i)).toBeInTheDocument()
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    // Simulate ORCA confirm success.
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('orca:watchlist-changed', { detail: { tickers: ['SOL'] } })
      )
    })

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByText('SOL')).toBeInTheDocument()
    })
  })
})
