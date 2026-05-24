import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import PersonalCopilotPanel from '@/components/orca/PersonalCopilotPanel'

function makeClient(token: string | null = 'tok') {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

describe('PersonalCopilotPanel', () => {
  it('seeds the first message with the experience-tuned greeting', async () => {
    render(
      <PersonalCopilotPanel
        experienceLevel="advanced"
        tickers={['BTC']}
        client={makeClient()}
        fetchImpl={vi.fn()}
      />
    )
    expect(screen.getByTestId('copilot-message-assistant-0').textContent).toContain('BTC')
  })

  it('updates the seeded greeting when tickers change before the user types', async () => {
    const { rerender } = render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={[]}
        client={makeClient()}
        fetchImpl={vi.fn()}
      />
    )
    rerender(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['SOL']}
        client={makeClient()}
        fetchImpl={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(screen.getByTestId('copilot-message-assistant-0').textContent).toContain('SOL')
    })
  })

  it('sends user input to /api/chat with the bearer token and renders the reply', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'BTC has had calm spot flow overnight.' }),
    })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    const input = screen.getByTestId('copilot-input')
    await userEvent.type(input, 'what is up with btc')
    await userEvent.click(screen.getByTestId('copilot-send'))

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ authorization: 'Bearer tok' }),
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/calm spot flow overnight/i)).toBeInTheDocument()
    })
    // The user's own message is shown too.
    expect(screen.getByText('what is up with btc')).toBeInTheDocument()
  })

  it('surfaces a quiet error line when the chat API returns non-OK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    render(
      <PersonalCopilotPanel
        experienceLevel="new"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'hi')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/could not respond/i)
    })
  })

  it('does not call the chat API when the user has no session', async () => {
    const fetchImpl = vi.fn()
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient(null)}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'hi')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/sign in/i)
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('renders no emoji on the seeded greeting', () => {
    render(
      <PersonalCopilotPanel
        experienceLevel="new"
        tickers={['BTC', 'SOL']}
        client={makeClient()}
        fetchImpl={vi.fn()}
      />
    )
    const text = screen.getByTestId('copilot-message-assistant-0').textContent || ''
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
  })
})
