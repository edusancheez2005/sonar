import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import OrcaStudioClient from '@/app/orca/OrcaStudioClient'

// Mock next/navigation
const routerReplace = vi.fn()
let mockSearchParams = new URLSearchParams('')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: routerReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/orca',
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

function jsonResponse(body: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

function makeFetch(mapping: Record<string, any>) {
  return vi.fn(async (url: string) => {
    for (const [key, val] of Object.entries(mapping)) {
      if (url.startsWith(key)) return jsonResponse(val)
    }
    return jsonResponse({}, 404)
  })
}

describe('OrcaStudioClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerReplace.mockReset()
    mockSearchParams = new URLSearchParams('')
  })

  it('renders the empty state when no session is selected', async () => {
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions?': { sessions: [] },
    })
    render(<OrcaStudioClient client={client as any} fetchImpl={fetchImpl as any} />)
    expect(await screen.findByTestId('orca-studio-empty')).toBeInTheDocument()
    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
  })

  it('renders the conversation when ?session= is in the URL', async () => {
    mockSearchParams = new URLSearchParams('session=abc-123')
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions?': { sessions: [] },
      '/api/orca/sessions/abc-123': { session: { id: 'abc-123' }, messages: [] },
    })
    render(<OrcaStudioClient client={client as any} fetchImpl={fetchImpl as any} />)
    expect(await screen.findByTestId('orca-conv-input')).toBeInTheDocument()
    expect(screen.queryByTestId('orca-studio-empty')).toBeNull()
  })

  it('clicking Start creates a new session and updates the URL', async () => {
    const client = mockClient()
    const fetchImpl = vi.fn(async (url: string, init?: any) => {
      if (url.startsWith('/api/orca/sessions?')) return jsonResponse({ sessions: [] })
      if (url === '/api/orca/sessions' && init?.method === 'POST') {
        return jsonResponse({ id: 'newly-created' }, 201)
      }
      if (url.startsWith('/api/orca/sessions/newly-created')) {
        return jsonResponse({ session: { id: 'newly-created' }, messages: [] })
      }
      return jsonResponse({}, 404)
    })
    render(<OrcaStudioClient client={client as any} fetchImpl={fetchImpl as any} />)
    await screen.findByTestId('orca-studio-start')
    await userEvent.click(screen.getByTestId('orca-studio-start'))
    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith('/orca?session=newly-created', { scroll: false })
    )
    expect(await screen.findByTestId('orca-conv-input')).toBeInTheDocument()
  })

  it('selecting a session from the list updates the URL', async () => {
    const client = mockClient()
    const fetchImpl = makeFetch({
      '/api/orca/sessions?': {
        sessions: [
          { id: 'sess-A', title: 'A', updated_at: new Date().toISOString() },
        ],
      },
      '/api/orca/sessions/sess-A': { session: { id: 'sess-A' }, messages: [] },
    })
    render(<OrcaStudioClient client={client as any} fetchImpl={fetchImpl as any} />)
    await screen.findByTestId('orca-session-row-sess-A')
    await userEvent.click(screen.getByTestId('orca-session-row-sess-A'))
    expect(routerReplace).toHaveBeenCalledWith('/orca?session=sess-A', { scroll: false })
  })
})
