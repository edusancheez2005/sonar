import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/app/lib/supabaseBrowserClient', () => ({
  supabaseBrowser: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}))

import AlertModalJs from '@/components/wallet-tracker/AlertModal'

const AlertModal = AlertModalJs as any

describe('AlertModal (wallet page)', () => {
  let fetchMock: any
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('creates a wallet_activity rule in user_alerts with the $100K default floor', async () => {
    const onClose = vi.fn()
    render(<AlertModal address="0xabc" chain="ethereum" onClose={onClose} />)
    fireEvent.click(screen.getByText('Create Alert'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/personal/alerts')
    expect(JSON.parse(init.body)).toEqual({ kind: 'wallet_activity', address: '0xabc', chain: 'ethereum', threshold_usd: 100000, source: 'wallet_page' })
  })

  it('"Any activity" sends no floor, and Telegram collects nothing', async () => {
    render(<AlertModal address="0xabc" chain={null} onClose={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'any_activity' } })
    expect(screen.queryByPlaceholderText(/telegram/i)).toBeNull()
    expect(screen.getByText(/Telegram delivery for personal alerts is coming soon/)).toBeTruthy()
    fireEvent.click(screen.getByText('Create Alert'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ kind: 'wallet_activity', address: '0xabc', source: 'wallet_page' })
  })

  it('keeps the dialog open and says why when the server refuses', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'rule_limit_reached' }) })
    const onClose = vi.fn()
    render(<AlertModal address="0xabc" onClose={onClose} />)
    fireEvent.click(screen.getByText('Create Alert'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/50-alert limit/)
    expect(onClose).not.toHaveBeenCalled()
  })
})
