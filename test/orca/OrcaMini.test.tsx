import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import OrcaMini from '@/components/orca/OrcaMini'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

function mockClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'tok' } },
      })),
    },
  }
}

function ok(body: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

function makeFetch(handlers: Record<string, (init?: any) => any>) {
  return vi.fn(async (url: string, init?: any) => {
    for (const [k, fn] of Object.entries(handlers)) {
      if (url.startsWith(k)) return fn(init)
    }
    return ok({}, 404)
  })
}

describe('OrcaMini', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the card, header and conversation atom', async () => {
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions': () => ok({ id: 'm-1' }, 201),
    })
    render(
      <OrcaMini
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    expect(screen.getByTestId('orca-mini')).toBeInTheDocument()
    expect(screen.getByText('ORCA')).toBeInTheDocument()
    expect(screen.getByTestId('orca-conv-input')).toBeInTheDocument()
    expect(screen.getByTestId('orca-mini-promote')).toBeInTheDocument()
  })

  it('lazily creates a session on mount with surface_seed mini', async () => {
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions': () => ok({ id: 'm-99' }, 201),
    })
    render(
      <OrcaMini
        client={client as any}
        fetchImpl={fetchImpl as any}
      />
    )
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    const call = (fetchImpl.mock.calls as any[]).find(([u]) => u === '/api/orca/sessions')
    expect(call).toBeTruthy()
    expect(call[1].method).toBe('POST')
    const body = JSON.parse(call[1].body)
    expect(body.surface_seed).toBe('mini')
  })

  it('"Open in Studio" pushes the router to /orca?session=<id>', async () => {
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions': () => ok({ id: 'm-7' }, 201),
    })
    const routerImpl = { push: vi.fn(), replace: vi.fn() }
    render(
      <OrcaMini
        client={client as any}
        fetchImpl={fetchImpl as any}
        routerImpl={routerImpl as any}
      />
    )
    // wait until session id is resolved
    await waitFor(() =>
      expect((screen.getByTestId('orca-mini-promote') as HTMLButtonElement).disabled).toBe(false)
    )
    await userEvent.click(screen.getByTestId('orca-mini-promote'))
    expect(routerImpl.push).toHaveBeenCalledWith('/orca?session=m-7')
  })

  it('falls back to /orca when no session was created', async () => {
    const client = mockClient()
    // 500 on session create
    const fetchImpl = makeFetch({
      '/api/orca/sessions': () => ok({}, 500),
    })
    const routerImpl = { push: vi.fn(), replace: vi.fn() }
    render(
      <OrcaMini
        client={client as any}
        fetchImpl={fetchImpl as any}
        routerImpl={routerImpl as any}
      />
    )
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    await waitFor(() =>
      expect((screen.getByTestId('orca-mini-promote') as HTMLButtonElement).disabled).toBe(false)
    )
    await userEvent.click(screen.getByTestId('orca-mini-promote'))
    expect(routerImpl.push).toHaveBeenCalledWith('/orca')
  })

  it('promotes to Studio when maxTurns is exceeded (via onPromote)', async () => {
    const client = mockClient()
    let chatHits = 0
    const fetchImpl = vi.fn(async (url: string, init?: any) => {
      if (url === '/api/orca/sessions' && init?.method === 'POST') {
        return ok({ id: 'm-prom' }, 201)
      }
      if (url === '/api/chat') {
        chatHits += 1
        return ok({ response: `reply ${chatHits}` })
      }
      return ok({}, 404)
    })
    const routerImpl = { push: vi.fn(), replace: vi.fn() }
    render(
      <OrcaMini
        client={client as any}
        fetchImpl={fetchImpl as any}
        routerImpl={routerImpl as any}
        maxTurns={2}
      />
    )
    await waitFor(() =>
      expect((screen.getByTestId('orca-mini-promote') as HTMLButtonElement).disabled).toBe(false)
    )
    const input = screen.getByTestId('orca-conv-input') as HTMLInputElement
    const send = screen.getByTestId('orca-conv-send')

    // Turn 1
    await userEvent.type(input, 'one')
    await userEvent.click(send)
    await waitFor(() => expect(chatHits).toBe(1))
    // Turn 2
    await userEvent.type(input, 'two')
    await userEvent.click(send)
    await waitFor(() => expect(chatHits).toBe(2))
    // Turn 3 — should NOT hit /api/chat; should trigger router.push instead.
    await userEvent.type(input, 'three')
    await userEvent.click(send)
    await waitFor(() =>
      expect(routerImpl.push).toHaveBeenCalledWith('/orca?session=m-prom')
    )
    expect(chatHits).toBe(2)
  })
})
