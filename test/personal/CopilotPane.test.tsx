import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import CopilotPane from '@/components/personal/CopilotPane'

function makeClient(token: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

describe('CopilotPane', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the no-focus chip when focus is null', () => {
    render(<CopilotPane focus={null} client={makeClient(null)} fetchImpl={vi.fn()} />)
    expect(screen.getByTestId('copilot-pane')).toBeInTheDocument()
    expect(screen.getByText(/no focus pinned/i)).toBeInTheDocument()
  })

  it('renders the context chip when focus is supplied and X clears it', async () => {
    const onClear = vi.fn()
    render(
      <CopilotPane
        focus={{ type: 'ticker', value: 'ETH', label: '$ETH' }}
        onClearFocus={onClear}
        client={makeClient(null)}
        fetchImpl={vi.fn()}
      />
    )
    const chip = screen.getByTestId('context-chip')
    expect(chip.textContent).toContain('$ETH')
    await userEvent.click(screen.getByTestId('context-chip-clear'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renders all four slash command buttons', () => {
    render(<CopilotPane focus={null} client={makeClient(null)} fetchImpl={vi.fn()} />)
    expect(screen.getByTestId('slash-watchlist')).toBeInTheDocument()
    expect(screen.getByTestId('slash-wallet')).toBeInTheDocument()
    expect(screen.getByTestId('slash-explain')).toBeInTheDocument()
    expect(screen.getByTestId('slash-news')).toBeInTheDocument()
  })

  it('clicking a slash command seeds the copilot input', async () => {
    render(<CopilotPane focus={null} client={makeClient(null)} fetchImpl={vi.fn()} />)
    await userEvent.click(screen.getByTestId('slash-news'))
    const input = await screen.findByRole('textbox')
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toMatch(/news/i)
    })
  })

  it('forwards a ticker focus into the chat request body as focus_ticker', async () => {
    const client = makeClient('tok')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    })
    render(
      <CopilotPane
        focus={{ type: 'ticker', value: 'sol', label: '$SOL' }}
        client={client}
        fetchImpl={fetchImpl}
      />
    )
    const input = await screen.findByRole('textbox')
    await userEvent.type(input, 'hi')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalled()
    })
    const call = fetchImpl.mock.calls.find((c: any[]) => c[0] === '/api/chat')
    const body = JSON.parse(call[1].body)
    expect(body.focus_ticker).toBe('SOL')
  })

  it('contains no emojis', () => {
    const { container } = render(
      <CopilotPane
        focus={{ type: 'ticker', value: 'BTC', label: '$BTC' }}
        client={makeClient(null)}
        fetchImpl={vi.fn()}
      />
    )
    expect(/\p{Extended_Pictographic}/u.test(container.textContent || '')).toBe(false)
  })
})
