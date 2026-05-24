import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import WalletsTab from '@/components/personal/WalletsTab'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

describe('WalletsTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows empty state when API returns no wallets', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByTestId('wallets-empty')).toBeInTheDocument()
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/personal/wallets',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer tok' }),
      })
    )
  })

  it('shows unauth message when there is no session', async () => {
    const client = makeClient(null)
    const fetchImpl = vi.fn()
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await waitFor(() => {
      expect(screen.getByText(/sign in to track wallets/i)).toBeInTheDocument()
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('renders wallet rows with truncated address and chain badge', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 1, address: '0xabcdef0123456789abcdef0123456789abcdef01', chain: 'eth', label: 'cold storage', created_at: 'now' },
        ],
      }),
    })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    const row = await screen.findByTestId('wallets-row-1')
    expect(row.textContent).toContain('cold storage')
    expect(row.textContent).toContain('ETH')
    expect(row.textContent).toMatch(/0xabcdef/)
  })

  it('opens the add-wallet modal when Add is clicked', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await screen.findByTestId('wallets-empty')
    await userEvent.click(screen.getByTestId('wallets-add'))
    expect(screen.getByTestId('wallets-modal')).toBeInTheDocument()
  })

  it('validates address shape before POSTing', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await screen.findByTestId('wallets-empty')
    await userEvent.click(screen.getByTestId('wallets-add'))
    await userEvent.type(screen.getByTestId('wallets-modal-address'), 'abc') // too short
    await userEvent.click(screen.getByTestId('wallets-modal-submit'))
    expect(screen.getByText(/too short/i)).toBeInTheDocument()
    // GET was called on mount; POST must not have fired.
    expect(fetchImpl.mock.calls.find((c: any[]) => c[1]?.method === 'POST')).toBeUndefined()
  })

  it('POSTs a wallet when the form is valid and refetches', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ item: { id: 7 } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 7, address: '0xabcdef0123456789abcdef0123456789abcdef01', chain: 'sol', label: null, created_at: 'now' }],
        }),
      })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await screen.findByTestId('wallets-empty')
    await userEvent.click(screen.getByTestId('wallets-add'))
    await userEvent.type(screen.getByTestId('wallets-modal-address'), '0xabcdef0123456789abcdef0123456789abcdef01')
    await userEvent.selectOptions(screen.getByTestId('wallets-modal-chain'), 'sol')
    await userEvent.click(screen.getByTestId('wallets-modal-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('wallets-row-7')).toBeInTheDocument()
    })
    const postCall = fetchImpl.mock.calls.find((c: any[]) => c[1]?.method === 'POST')
    expect(postCall).toBeDefined()
    expect(postCall[0]).toBe('/api/personal/wallets')
    const body = JSON.parse(postCall[1].body)
    expect(body.chain).toBe('sol')
  })

  it('Ask ORCA on a row calls onAskOrca with address + chain + label', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: 3, address: '0xfeed', chain: 'eth', label: 'hot', created_at: 'now' }],
      }),
    })
    const onAsk = vi.fn()
    render(<WalletsTab client={client} fetchImpl={fetchImpl} onAskOrca={onAsk} />)
    await screen.findByTestId('wallets-row-3')
    await userEvent.click(screen.getByTestId('wallets-ask-3'))
    expect(onAsk).toHaveBeenCalledWith('0xfeed', 'eth', 'hot')
  })

  it('two-step delete: first click arms, second click DELETEs', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 9, address: '0xdead', chain: 'eth', label: 'x', created_at: 'now' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
    render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await screen.findByTestId('wallets-row-9')
    await userEvent.click(screen.getByTestId('wallets-delete-9'))
    await userEvent.click(screen.getByTestId('wallets-confirm-9'))
    const deleteCall = fetchImpl.mock.calls.find((c: any[]) => c[1]?.method === 'DELETE')
    expect(deleteCall).toBeDefined()
    expect(deleteCall[0]).toContain('id=9')
  })

  it('contains no emoji characters', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    const { container } = render(<WalletsTab client={client} fetchImpl={fetchImpl} />)
    await screen.findByTestId('wallets-empty')
    expect(/\p{Extended_Pictographic}/u.test(container.textContent || '')).toBe(false)
  })
})
