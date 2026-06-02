import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import AlertsTab from '@/components/personal/AlertsTab'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

/** Route-aware fetch mock for the three endpoints AlertsTab loads. */
function makeFetch(opts: { rules?: any[]; muted?: { tickers: string[]; until_iso: string | null } }) {
  return vi.fn((url: string, init?: any) => {
    if (url.startsWith('/api/personal/alerts')) {
      return Promise.resolve({ ok: true, json: async () => ({ rules: opts.rules ?? [] }) })
    }
    if (url.startsWith('/api/notifications/preferences')) {
      return Promise.resolve({ ok: true, json: async () => ({ notifications_in_app: true, notification_style: 'balanced' }) })
    }
    if (url.startsWith('/api/personal/mute')) {
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      }
      return Promise.resolve({ ok: true, json: async () => (opts.muted ?? { tickers: [], until_iso: null }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

describe('AlertsTab — muted tickers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Muted tickers section with the muted symbols', async () => {
    const client = makeClient('tok')
    const fetchImpl = makeFetch({ muted: { tickers: ['BTC', 'SOL'], until_iso: '2026-12-31T00:00:00Z' } })
    render(<AlertsTab client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/Muted tickers · until/i)).toBeInTheDocument()
    })
    expect(screen.getByText('BTC')).toBeInTheDocument()
    expect(screen.getByText('SOL')).toBeInTheDocument()
  })

  it('does not render the Muted section when nothing is muted', async () => {
    const client = makeClient('tok')
    const fetchImpl = makeFetch({ muted: { tickers: [], until_iso: null } })
    render(<AlertsTab client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText('Delivery')).toBeInTheDocument()
    })
    expect(screen.queryByText('Muted tickers', { exact: false })).not.toBeInTheDocument()
  })

  it('unmuting a ticker fires a DELETE and removes it from the list', async () => {
    const client = makeClient('tok')
    const fetchImpl = makeFetch({ muted: { tickers: ['BTC'], until_iso: '2026-12-31T00:00:00Z' } })
    render(<AlertsTab client={client} fetchImpl={fetchImpl} />)
    const unmute = await screen.findByRole('button', { name: /unmute BTC/i })
    await userEvent.click(unmute)
    const del = fetchImpl.mock.calls.find((c: any[]) => c[1]?.method === 'DELETE')
    expect(del).toBeDefined()
    expect(del![0]).toContain('ticker=BTC')
    await waitFor(() => {
      expect(screen.queryByText('BTC')).not.toBeInTheDocument()
    })
  })

  it('refetches when an "orca:mute-changed" event fires', async () => {
    const client = makeClient('tok')
    const fetchImpl = makeFetch({ muted: { tickers: [], until_iso: null } })
    render(<AlertsTab client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => expect(screen.getByText('Delivery')).toBeInTheDocument())
    const before = fetchImpl.mock.calls.filter((c: any[]) => String(c[0]).startsWith('/api/personal/mute')).length
    window.dispatchEvent(new CustomEvent('orca:mute-changed'))
    await waitFor(() => {
      const after = fetchImpl.mock.calls.filter((c: any[]) => String(c[0]).startsWith('/api/personal/mute')).length
      expect(after).toBeGreaterThan(before)
    })
  })
})
