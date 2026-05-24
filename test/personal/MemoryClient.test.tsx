import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const getSession = vi.fn()
vi.mock('@/app/lib/supabaseBrowserClient', () => ({
  supabaseBrowser: () => ({ auth: { getSession } }),
}))

import MemoryClient from '@/app/dashboard/personal/memory/MemoryClient'

function mockFetch(impl: any) {
  ;(globalThis as any).fetch = vi.fn(impl)
}

const sampleFacts = [
  { id: 1, fact: 'User trades on a 1-week horizon', confidence: 0.82, expires_at: '2027-01-01T00:00:00Z' },
  { id: 2, fact: 'User holds BTC and ETH', confidence: 0.91, expires_at: null },
]

describe('MemoryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the sign-in empty state when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    mockFetch(() => { throw new Error('should not be called') })
    render(<MemoryClient />)
    await screen.findByText(/sign in to view/i)
    expect(screen.queryByTestId('delete-all')).toBeNull()
  })

  it('lists facts returned by the API and renders the delete-all button', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ facts: sampleFacts }) }))
    render(<MemoryClient />)
    await screen.findByTestId('memory-row-1')
    expect(screen.getByTestId('memory-row-2')).toBeInTheDocument()
    expect(screen.getByTestId('delete-all')).not.toBeDisabled()
  })

  it('renders the empty-state copy when facts list is empty', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ facts: [] }) }))
    render(<MemoryClient />)
    await screen.findByTestId('memory-empty')
    expect(screen.getByTestId('delete-all')).toBeDisabled()
  })

  it('shows an error line when GET returns non-OK', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    render(<MemoryClient />)
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toMatch(/HTTP 503/)
  })

  it('deleteOne calls DELETE with the id and removes the row on success', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      if (opts?.method === 'DELETE') return { ok: true, status: 200, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ facts: sampleFacts }) }
    })
    ;(globalThis as any).fetch = fetchMock
    render(<MemoryClient />)
    await screen.findByTestId('memory-row-1')
    await userEvent.click(screen.getByTestId('memory-delete-1'))
    await waitFor(() => {
      expect(screen.queryByTestId('memory-row-1')).toBeNull()
    })
    const del = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === 'DELETE')
    expect(del[0]).toContain('id=1')
    expect(del[1].headers.authorization).toBe('Bearer tok')
  })

  it('delete-all requires confirmation modal and sends x-confirm-delete-all header', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      if (opts?.method === 'DELETE') return { ok: true, status: 200, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ facts: sampleFacts }) }
    })
    ;(globalThis as any).fetch = fetchMock
    render(<MemoryClient />)
    await screen.findByTestId('memory-row-1')

    await userEvent.click(screen.getByTestId('delete-all'))
    expect(screen.getByTestId('confirm-all-shade')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('confirm-all-yes'))
    await waitFor(() => {
      expect(screen.queryByTestId('memory-row-1')).toBeNull()
    })
    const del = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === 'DELETE')
    expect(del[1].headers['x-confirm-delete-all']).toBe('yes')
  })

  it('contains no emojis', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ facts: sampleFacts }) }))
    const { container } = render(<MemoryClient />)
    await screen.findByTestId('memory-row-1')
    expect(/\p{Extended_Pictographic}/u.test(container.textContent || '')).toBe(false)
  })
})
