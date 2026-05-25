import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import OrcaConversation from '@/components/orca/OrcaConversation'

function makeClient(token: string | null = 'tok') {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: token ? { session: { access_token: token } } : { session: null },
      }),
    },
  } as any
}

function okResponse(body: any) {
  return { ok: true, status: 200, json: async () => body }
}

describe('OrcaConversation — atom', () => {
  it('renders seedMessages on first paint and keeps them after re-render', () => {
    render(
      <OrcaConversation
        client={makeClient()}
        fetchImpl={vi.fn()}
        seedMessages={[{ role: 'assistant', content: 'Welcome to ORCA.' }]}
      />
    )
    expect(screen.getByTestId('orca-conv-message-assistant-0').textContent).toContain(
      'Welcome to ORCA.'
    )
  })

  it('sends user input to /api/chat with the bearer token and renders the reply', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okResponse({ response: 'BTC has had calm spot flow overnight.' })
    )
    render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'what is up with btc')
    await userEvent.click(screen.getByTestId('orca-conv-send'))

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
    expect(screen.getByText('what is up with btc')).toBeInTheDocument()
  })

  it('does not call the chat API when the user has no session', async () => {
    const fetchImpl = vi.fn()
    render(<OrcaConversation client={makeClient(null)} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/sign in/i)
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('surfaces a quiet error line when the chat API returns 500', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/could not respond/i)
    })
  })

  it('surfaces a timeout message when the chat API returns 504', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 504 })
    render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/took too long/i)
    })
  })

  it('surfaces a rate-limit message when the chat API returns 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/chat limit/i)
    })
  })

  it('shows an actionable message when fetch itself rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      const text = screen.getByRole('alert').textContent || ''
      expect(text).toMatch(/did not complete|offline/i)
    })
  })

  it('forwards focus.ticker as focus_ticker in the request body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ response: 'ok' }))
    render(
      <OrcaConversation
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
        focus={{ type: 'ticker', value: 'ETH', label: '$ETH' }}
      />
    )
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'explain')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      const call = fetchImpl.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.focus_ticker).toBe('ETH')
    })
  })

  it('renders a Pinned chip when focus is present', () => {
    render(
      <OrcaConversation
        client={makeClient()}
        fetchImpl={vi.fn()}
        focus={{ type: 'ticker', value: 'BTC', label: '$BTC' }}
      />
    )
    expect(screen.getByTestId('orca-conv-focus').textContent).toMatch(/\$BTC/)
  })

  it('forwards sessionId as session_id in the request body when provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ response: 'ok' }))
    render(
      <OrcaConversation
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
        sessionId="sess-123"
      />
    )
    await userEvent.type(screen.getByTestId('orca-conv-input'), 'hi')
    await userEvent.click(screen.getByTestId('orca-conv-send'))
    await waitFor(() => {
      const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
      expect(body.session_id).toBe('sess-123')
    })
  })

  describe('two-trip confirmation (v4 §5.3)', () => {
    it('renders Confirm + Cancel buttons when the orchestrator returns a confirm payload', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        okResponse({
          response: "I'll add $BTC to your watchlist.",
          confirm: { label: 'Add BTC to watchlist', calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }] },
        })
      )
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'add btc to my watchlist')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => {
        expect(screen.getByTestId('orca-conv-confirm')).toBeInTheDocument()
        expect(screen.getByTestId('orca-conv-cancel')).toBeInTheDocument()
      })
    })

    it('Confirm click POSTs again with confirm.calls payload', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            response: "I'll add $BTC to your watchlist.",
            confirm: { label: 'Add BTC to watchlist', calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }] },
          })
        )
        .mockResolvedValueOnce(okResponse({ response: 'Added BTC to your watchlist.' }))
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'add btc to my watchlist')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => expect(screen.getByTestId('orca-conv-confirm')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('orca-conv-confirm'))
      await waitFor(() => {
        const calls = fetchImpl.mock.calls
        expect(calls.length).toBe(2)
        const body = JSON.parse(calls[1][1].body)
        expect(body.confirm).toEqual({
          calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }],
        })
      })
      await waitFor(() =>
        expect(screen.getByText(/added btc to your watchlist/i)).toBeInTheDocument()
      )
    })

    it('Cancel click renders a "nothing was changed" message and does NOT re-POST', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        okResponse({
          response: 'Want to add $BTC?',
          confirm: { label: 'Add BTC', calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }] },
        })
      )
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'add btc')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => expect(screen.getByTestId('orca-conv-cancel')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('orca-conv-cancel'))
      await waitFor(() =>
        expect(screen.getByText(/nothing was changed/i)).toBeInTheDocument()
      )
      // Only the original POST — Cancel does not re-call the API.
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('a fresh user message clears any pending confirmation', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            response: 'Want to add $BTC?',
            confirm: { label: 'Add BTC', calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }] },
          })
        )
        .mockResolvedValueOnce(okResponse({ response: 'BTC price is $69k.' }))
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'add btc')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => expect(screen.getByTestId('orca-conv-confirm')).toBeInTheDocument())

      // Type a different message — pendingConfirm should clear immediately on submit.
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'what is btc price')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() =>
        expect(screen.queryByTestId('orca-conv-confirm')).not.toBeInTheDocument()
      )
    })
  })

  describe('follow-up chips', () => {
    it('renders follow-up chips returned by the orchestrator', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        okResponse({
          response: 'BTC is consolidating around $69k.',
          follow_ups: ['What changed in the last hour?', 'Who is selling?'],
        })
      )
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'btc')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => {
        const chips = screen.getByTestId('orca-conv-followups')
        expect(chips.textContent).toMatch(/changed in the last hour/i)
        expect(chips.textContent).toMatch(/who is selling/i)
      })
    })

    it('clicking a follow-up chip submits it as the next message', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            response: 'BTC is consolidating.',
            follow_ups: ['Who is selling?'],
          })
        )
        .mockResolvedValueOnce(okResponse({ response: 'Mostly short-term holders.' }))
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'btc')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() =>
        expect(screen.getByTestId('orca-conv-followups')).toBeInTheDocument()
      )

      const chip = screen.getByRole('button', { name: /who is selling/i })
      await userEvent.click(chip)

      await waitFor(() => {
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        const body = JSON.parse(fetchImpl.mock.calls[1][1].body)
        expect(body.message).toBe('Who is selling?')
      })
    })
  })

  describe('sources strip', () => {
    it('renders source pills when the response includes a sources array', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        okResponse({
          response: 'BTC update.',
          sources: [
            { label: 'CoinGecko', url: 'https://coingecko.com/btc' },
            'https://example.com/raw',
          ],
        })
      )
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'btc')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => {
        const strip = screen.getByTestId('orca-conv-sources')
        expect(strip).toBeInTheDocument()
        expect(strip.textContent).toMatch(/CoinGecko/)
      })
    })
  })

  describe('mini variant maxTurns', () => {
    it('calls onPromote instead of POSTing when maxTurns is reached', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(okResponse({ response: 'reply' }))
      const onPromote = vi.fn()
      render(
        <OrcaConversation
          client={makeClient('tok')}
          fetchImpl={fetchImpl}
          variant="mini"
          maxTurns={1}
          onPromote={onPromote}
          sessionId="sess-mini-1"
        />
      )
      // First turn — goes through.
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'first')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))

      // Second turn — exceeds maxTurns, should promote not POST.
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'second')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() => expect(onPromote).toHaveBeenCalledWith('sess-mini-1'))
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })
  })

  it('contains no emojis in any built-in copy', () => {
    render(
      <OrcaConversation
        client={makeClient()}
        fetchImpl={vi.fn()}
        seedMessages={[{ role: 'assistant', content: 'Welcome.' }]}
      />
    )
    const wrap = screen.getByLabelText('ORCA conversation')
    const text = wrap.textContent || ''
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
  })

  // v4 §6 branch #10 (polish) -----------------------------------------------

  describe('disclaimer fold', () => {
    it('hides the MANDATORY_DISCLAIMER text behind a collapsed fold', () => {
      const body = 'BTC moved 2 percent in the last hour.'
      const disclaimerText =
        'This output is an automated summary of public data for informational and educational purposes only.'
      const content = `${body}\n\n---\n${disclaimerText}\n---`
      render(
        <OrcaConversation
          client={makeClient()}
          fetchImpl={vi.fn()}
          seedMessages={[{ role: 'assistant', content }]}
        />
      )
      const bubble = screen.getByTestId('orca-conv-message-assistant-0')
      expect(bubble.textContent).toContain(body)
      // Disclaimer body is in the DOM (inside <details>) but not visible until expanded.
      const fold = screen.getByTestId('orca-conv-disclaimer-0')
      expect(fold).toBeInTheDocument()
      expect(fold.hasAttribute('open')).toBe(false)
      expect(screen.getByText('Disclaimer')).toBeInTheDocument()
    })

    it('leaves messages without a disclaimer untouched', () => {
      render(
        <OrcaConversation
          client={makeClient()}
          fetchImpl={vi.fn()}
          seedMessages={[{ role: 'assistant', content: 'No disclaimer here.' }]}
        />
      )
      expect(screen.queryByTestId('orca-conv-disclaimer-0')).not.toBeInTheDocument()
    })
  })

  describe('follow-up keyboard shortcuts', () => {
    it('selects the first follow-up chip when "1" is pressed', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            response: 'reply one',
            follow_ups: ['Tell me more', 'Show whales', 'Latest news'],
          })
        )
        .mockResolvedValueOnce(okResponse({ response: 'reply two' }))
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      await userEvent.type(screen.getByTestId('orca-conv-input'), 'first')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() =>
        expect(screen.getByTestId('orca-conv-followups')).toBeInTheDocument()
      )
      // Blur the input first so the keydown listener engages.
      ;(document.activeElement as HTMLElement | null)?.blur()
      await userEvent.keyboard('1')
      await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))
      const body = JSON.parse(fetchImpl.mock.calls[1][1].body)
      expect(body.message).toBe('Tell me more')
    })

    it('does not hijack number keys while the input is focused', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            response: 'reply one',
            follow_ups: ['Tell me more'],
          })
        )
      render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
      const input = screen.getByTestId('orca-conv-input') as HTMLInputElement
      await userEvent.type(input, 'first')
      await userEvent.click(screen.getByTestId('orca-conv-send'))
      await waitFor(() =>
        expect(screen.getByTestId('orca-conv-followups')).toBeInTheDocument()
      )
      input.focus()
      await userEvent.keyboard('1')
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(input.value).toContain('1')
    })
  })

  describe('source-strip favicons and telemetry', () => {
    it('renders a favicon img next to each source pill and emits orca:source-click on click', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        okResponse({
          response: 'BTC update.',
          sources: [
            { label: 'CoinGecko', url: 'https://www.coingecko.com/btc' },
            { label: 'Etherscan', url: 'https://etherscan.io/tx/0xabc' },
          ],
        })
      )
      const events: any[] = []
      const handler = (e: Event) => events.push((e as CustomEvent).detail)
      window.addEventListener('orca:source-click', handler)
      try {
        render(<OrcaConversation client={makeClient('tok')} fetchImpl={fetchImpl} />)
        await userEvent.type(screen.getByTestId('orca-conv-input'), 'btc')
        await userEvent.click(screen.getByTestId('orca-conv-send'))
        await waitFor(() => screen.getByTestId('orca-conv-sources'))
        const pill0 = screen.getByTestId('orca-conv-source-0')
        const pill1 = screen.getByTestId('orca-conv-source-1')
        expect(pill0.querySelector('img')?.getAttribute('src')).toMatch(
          /google\.com\/s2\/favicons.*coingecko\.com/
        )
        expect(pill1.querySelector('img')?.getAttribute('src')).toMatch(
          /google\.com\/s2\/favicons.*etherscan\.io/
        )
        // Prevent default so jsdom doesn't try to navigate.
        pill0.addEventListener('click', (e) => e.preventDefault(), { once: true })
        await userEvent.click(pill0)
        expect(events.length).toBe(1)
        expect(events[0]).toMatchObject({
          index: 0,
          url: 'https://www.coingecko.com/btc',
          label: 'CoinGecko',
        })
      } finally {
        window.removeEventListener('orca:source-click', handler)
      }
    })
  })
})
