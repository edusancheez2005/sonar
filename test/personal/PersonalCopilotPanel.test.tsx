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

  it('surfaces a timeout-specific message when the chat API returns 504', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 504 })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'why is btc moving')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/took too long/i)
    })
  })

  it('surfaces a rate-limit message when the chat API returns 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'hi')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/chat limit/i)
    })
  })

  it('renders an actionable message when fetch itself rejects (no generic "Network error")', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'hi')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      const text = screen.getByRole('alert').textContent || ''
      expect(text).toMatch(/did not complete|offline/i)
      expect(text).not.toMatch(/network error talking to orca/i)
    })
  })

  it('forwards focusTicker into the request body when supplied', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['ETH']}
        focusTicker="ETH"
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'explain')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => {
      const call = fetchImpl.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.focus_ticker).toBe('ETH')
    })
  })

  it('persists a session_id to sessionStorage and sends it on every POST', async () => {
    window.sessionStorage.clear()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['ETH']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'explain')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    const sid = window.sessionStorage.getItem('orca:personal-copilot:sid')
    expect(sid).toBeTruthy()
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.session_id).toBe(sid)
  })

  it('dispatches the matching orca:<x>-changed event when a confirmed write returns invalidate', async () => {
    const fetchImpl = vi.fn()
      // Trip 1 — server asks to confirm a wallet track.
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Track wallet 0x515b…33C8 on bsc?',
          confirm: { label: 'Track wallet 0x515b…33C8 on bsc?', calls: [{ tool: 'trackWallet', args: { address: '0x515b72Ed8a97F42C568D6A143232775018f133C8', chain: 'bsc' } }] },
        }),
      })
      // Trip 2 — confirmed write succeeds and reports which data sets changed.
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Now tracking 0x515b…33C8 on bsc.', success: true, invalidate: ['wallets'] }),
      })
    const onWallets = vi.fn()
    window.addEventListener('orca:wallets-changed', onWallets)
    try {
      render(
        <PersonalCopilotPanel
          experienceLevel="intermediate"
          tickers={['ETH']}
          client={makeClient('tok')}
          fetchImpl={fetchImpl}
        />
      )
      await userEvent.type(screen.getByTestId('copilot-input'), 'track wallet 0x515b72Ed8a97F42C568D6A143232775018f133C8 on bsc')
      await userEvent.click(screen.getByTestId('copilot-send'))
      await waitFor(() => expect(screen.getByText(/Track wallet 0x515b…33C8 on bsc\?/i)).toBeInTheDocument())

      await userEvent.type(screen.getByTestId('copilot-input'), 'yes')
      await userEvent.click(screen.getByTestId('copilot-send'))
      await waitFor(() => expect(onWallets).toHaveBeenCalled())
    } finally {
      window.removeEventListener('orca:wallets-changed', onWallets)
    }
  })
})
