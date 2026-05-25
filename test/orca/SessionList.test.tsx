import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import SessionList from '@/components/orca/SessionList'

function mockClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'tok' } },
      })),
    },
  }
}

function ok(body: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response)
}

describe('SessionList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders empty state when API returns no sessions', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() => ok({ sessions: [] }))
    render(
      <SessionList
        activeSessionId={null}
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
    )
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/orca/sessions?limit=50',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer tok' }),
      })
    )
  })

  it('renders rows and marks the active one', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      ok({
        sessions: [
          {
            id: 'aaa-111',
            title: 'BTC outlook',
            updated_at: new Date().toISOString(),
          },
          {
            id: 'bbb-222',
            title: null,
            updated_at: new Date(Date.now() - 3600_000).toISOString(),
          },
        ],
      })
    )
    render(
      <SessionList
        activeSessionId="bbb-222"
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('orca-session-row-aaa-111')).toBeInTheDocument()
    )
    expect(screen.getByText('BTC outlook')).toBeInTheDocument()
    expect(screen.getByText('Untitled conversation')).toBeInTheDocument()
    expect(
      screen.getByTestId('orca-session-row-bbb-222').getAttribute('aria-current')
    ).toBe('true')
  })

  it('calls onSelect when a row is clicked', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      ok({
        sessions: [{ id: 'sess-1', title: 'Hi', updated_at: new Date().toISOString() }],
      })
    )
    const onSelect = vi.fn()
    render(
      <SessionList
        activeSessionId={null}
        onSelect={onSelect}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-row-sess-1')
    await userEvent.click(screen.getByTestId('orca-session-row-sess-1'))
    expect(onSelect).toHaveBeenCalledWith('sess-1')
  })

  it('calls onNew when New is clicked', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() => ok({ sessions: [] }))
    const onNew = vi.fn()
    render(
      <SessionList
        activeSessionId={null}
        onSelect={() => {}}
        onNew={onNew}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-new')
    await userEvent.click(screen.getByTestId('orca-session-new'))
    expect(onNew).toHaveBeenCalled()
  })

  it('shows an error if the request fails', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response)
    )
    render(
      <SessionList
        activeSessionId={null}
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/Could not load conversations/i)).toBeInTheDocument()
    )
  })

  it('shows sign-in prompt if there is no session token', async () => {
    const client = {
      auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    }
    const fetchImpl = vi.fn(() => ok({ sessions: [] }))
    render(
      <SessionList
        activeSessionId={null}
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/Sign in to see your conversations/i)).toBeInTheDocument()
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  // v4 §6 branch #9 (history) -------------------------------------------------

  function listFetch(sessions: any[]) {
    return vi.fn(async (url: string, init?: any) => {
      if (url.startsWith('/api/orca/sessions?')) return ok({ sessions }) as any
      if (init?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) }) as any
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }) as any
    })
  }

  it('filters rows by the search query (case-insensitive substring)', async () => {
    const client = mockClient()
    const fetchImpl = listFetch([
      { id: 'a', title: 'BTC outlook', updated_at: new Date().toISOString() },
      { id: 'b', title: 'ETH gas tonight', updated_at: new Date().toISOString() },
      { id: 'c', title: 'SOL whales', updated_at: new Date().toISOString() },
    ])
    render(
      <SessionList
        activeSessionId={null}
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-row-a')
    await userEvent.type(screen.getByTestId('orca-session-search'), 'eth')
    await waitFor(() =>
      expect(screen.queryByTestId('orca-session-row-a')).not.toBeInTheDocument()
    )
    expect(screen.getByTestId('orca-session-row-b')).toBeInTheDocument()
    expect(screen.queryByTestId('orca-session-row-c')).not.toBeInTheDocument()
  })

  it('renames a session on Enter and PATCHes /api/orca/sessions/{id}', async () => {
    const client = mockClient()
    const fetchImpl = listFetch([
      { id: 'r1', title: 'old title', updated_at: new Date().toISOString() },
    ])
    render(
      <SessionList
        activeSessionId="r1"
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-rename-r1')
    await userEvent.click(screen.getByTestId('orca-session-rename-r1'))
    const input = await screen.findByTestId('orca-session-rename-input-r1')
    await userEvent.clear(input)
    await userEvent.type(input, 'new title{Enter}')

    await waitFor(() => {
      const patchCall = (fetchImpl.mock.calls as any[]).find(
        ([url, init]) => url === '/api/orca/sessions/r1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeTruthy()
      const body = JSON.parse(patchCall[1].body)
      expect(body).toEqual({ title: 'new title' })
    })
    await waitFor(() =>
      expect(screen.getByText('new title')).toBeInTheDocument()
    )
  })

  it('cancels rename on Escape and does not PATCH', async () => {
    const client = mockClient()
    const fetchImpl = listFetch([
      { id: 'r2', title: 'keep me', updated_at: new Date().toISOString() },
    ])
    render(
      <SessionList
        activeSessionId="r2"
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-rename-r2')
    await userEvent.click(screen.getByTestId('orca-session-rename-r2'))
    const input = await screen.findByTestId('orca-session-rename-input-r2')
    await userEvent.clear(input)
    await userEvent.type(input, 'discarded{Escape}')
    await waitFor(() =>
      expect(screen.queryByTestId('orca-session-rename-input-r2')).not.toBeInTheDocument()
    )
    expect(screen.getByText('keep me')).toBeInTheDocument()
    const patchCall = (fetchImpl.mock.calls as any[]).find(
      ([, init]) => init?.method === 'PATCH'
    )
    expect(patchCall).toBeFalsy()
  })

  it('archives a session optimistically and PATCHes { archived: true }', async () => {
    const client = mockClient()
    const fetchImpl = listFetch([
      { id: 'k1', title: 'kept', updated_at: new Date().toISOString() },
      { id: 'k2', title: 'doomed', updated_at: new Date().toISOString() },
    ])
    render(
      <SessionList
        activeSessionId="k1"
        onSelect={() => {}}
        onNew={() => {}}
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await screen.findByTestId('orca-session-row-k2')
    await userEvent.click(screen.getByTestId('orca-session-archive-k2'))
    await waitFor(() =>
      expect(screen.queryByTestId('orca-session-row-k2')).not.toBeInTheDocument()
    )
    expect(screen.getByTestId('orca-session-row-k1')).toBeInTheDocument()
    await waitFor(() => {
      const patchCall = (fetchImpl.mock.calls as any[]).find(
        ([url, init]) => url === '/api/orca/sessions/k2' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeTruthy()
      const body = JSON.parse(patchCall[1].body)
      expect(body).toEqual({ archived: true })
    })
  })
})
