/**
 * PersonalCopilotPanel — confirm/cancel flow tests (v4 §5.4).
 *
 * Covers: rendering the Confirm/Cancel buttons when /api/chat returns a
 * `confirm` payload; firing a second POST with `confirm.calls` on click;
 * dismissing the prompt on Cancel.
 *
 * No fake timers (see /memories/repo/orca-redesign-2026-05-24.md).
 */
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

const FAST_WRITE_CONFIRM = {
  label: 'Add BTC to watchlist',
  calls: [{ tool: 'addToWatchlist', args: { ticker: 'BTC' } }],
}

describe('PersonalCopilotPanel — confirm flow', () => {
  it('renders Confirm/Cancel buttons when the server returns a confirm payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Add BTC to your watchlist? Click Confirm.',
        confirm: FAST_WRITE_CONFIRM,
      }),
    })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={['BTC']}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'add BTC to my watchlist')
    await userEvent.click(screen.getByTestId('copilot-send'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-confirm-row')).toBeInTheDocument()
    })
    expect(screen.getByTestId('copilot-confirm')).toHaveAttribute('aria-label', 'Add BTC to watchlist')
    expect(screen.getByTestId('copilot-cancel')).toBeInTheDocument()
  })

  it('clicking Confirm POSTs a second request with confirm.calls and renders the reply', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Add BTC to your watchlist? Click Confirm.',
          confirm: FAST_WRITE_CONFIRM,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Done — BTC is now on your watchlist.' }),
      })

    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={[]}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'add BTC to my watchlist')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => expect(screen.getByTestId('copilot-confirm')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('copilot-confirm'))

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))
    const secondCallBody = JSON.parse(fetchImpl.mock.calls[1][1].body)
    expect(secondCallBody.confirm).toBeDefined()
    expect(secondCallBody.confirm.calls).toEqual(FAST_WRITE_CONFIRM.calls)

    await waitFor(() => {
      expect(screen.getByText(/Done — BTC is now on your watchlist\./i)).toBeInTheDocument()
    })
    // Confirm row should be gone now.
    expect(screen.queryByTestId('copilot-confirm-row')).not.toBeInTheDocument()
  })

  it('clicking Cancel dismisses the prompt without a second POST', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Add BTC to your watchlist? Click Confirm.',
        confirm: FAST_WRITE_CONFIRM,
      }),
    })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={[]}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'add BTC to my watchlist')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => expect(screen.getByTestId('copilot-cancel')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('copilot-cancel'))

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('copilot-confirm-row')).not.toBeInTheDocument()
    expect(screen.getByText(/Cancelled\. Nothing was changed\./i)).toBeInTheDocument()
  })

  it('typing a new message invalidates a pending confirm', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Add BTC to your watchlist? Click Confirm.',
          confirm: FAST_WRITE_CONFIRM,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'ETH whale flow looks calm.' }),
      })
    render(
      <PersonalCopilotPanel
        experienceLevel="intermediate"
        tickers={[]}
        client={makeClient('tok')}
        fetchImpl={fetchImpl}
      />
    )
    await userEvent.type(screen.getByTestId('copilot-input'), 'add BTC to my watchlist')
    await userEvent.click(screen.getByTestId('copilot-send'))
    await waitFor(() => expect(screen.getByTestId('copilot-confirm')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('copilot-input'), 'what about ETH?')
    await userEvent.click(screen.getByTestId('copilot-send'))

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))
    expect(screen.queryByTestId('copilot-confirm-row')).not.toBeInTheDocument()
    // The second POST does NOT carry a confirm — the new message superseded it.
    const secondCallBody = JSON.parse(fetchImpl.mock.calls[1][1].body)
    expect(secondCallBody.confirm).toBeUndefined()
  })
})
