import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import ToolInspector from '@/components/orca/ToolInspector'

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
  return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
}

describe('ToolInspector', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the empty hint when no session is selected', () => {
    render(
      <ToolInspector
        sessionId={null}
        client={mockClient() as any}
        fetchImpl={vi.fn() as any}
      />
    )
    expect(screen.getByText(/Pick a conversation/i)).toBeInTheDocument()
  })

  it('renders a turn with tool calls and status dots', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      ok({
        session: { id: 'sess-1' },
        messages: [
          { role: 'user', content: 'price of btc?' },
          {
            role: 'assistant',
            content: 'BTC is around 60k',
            tool_calls: [
              { tool: 'getPrice', source: 'live', ok: true, latency_ms: 120 },
              { tool: 'getWhales', source: 'timeout', ok: false, error: 'timed_out' },
            ],
          },
        ],
      })
    )
    render(
      <ToolInspector
        sessionId="sess-1"
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('orca-inspector-turn-0')).toBeInTheDocument()
    )
    expect(screen.getByText('getPrice')).toBeInTheDocument()
    expect(screen.getByText('getWhales')).toBeInTheDocument()
    expect(screen.getByText(/120ms/)).toBeInTheDocument()
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/orca/sessions/sess-1',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer tok' }),
      })
    )
  })

  it('shows the no-trace empty state when there are no assistant tool calls', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      ok({
        session: { id: 'sess-1' },
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello', tool_calls: [] },
        ],
      })
    )
    render(
      <ToolInspector
        sessionId="sess-1"
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/No tool calls recorded/i)).toBeInTheDocument()
    )
  })

  it('shows an error if the request fails', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response)
    )
    render(
      <ToolInspector
        sessionId="sess-1"
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/Could not load trace/i)).toBeInTheDocument()
    )
  })

  it('re-fetches when refreshKey changes', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(() =>
      ok({ session: { id: 's' }, messages: [] })
    )
    const { rerender } = render(
      <ToolInspector
        sessionId="sess-1"
        client={client as any}
        fetchImpl={fetchImpl as any}
        refreshKey={0}
      />
    )
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))
    rerender(
      <ToolInspector
        sessionId="sess-1"
        client={client as any}
        fetchImpl={fetchImpl as any}
        refreshKey={1}
      />
    )
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))
  })
})
