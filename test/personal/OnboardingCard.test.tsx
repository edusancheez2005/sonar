import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import OnboardingCard from '@/components/personal/v2/OnboardingCard'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'

function setup(over: Partial<React.ComponentProps<typeof OnboardingCard>> = {}) {
  const props = {
    suggestions: [{ symbol: 'LINK', trades: 12 }],
    wallets: [],
    coins: [],
    onAddCoin: vi.fn().mockResolvedValue({ ok: true }),
    onFollow: vi.fn().mockResolvedValue(true),
    onAlertSaved: vi.fn(),
    onTour: vi.fn(),
    busy: {},
    ...over,
  }
  render(<OnboardingCard {...(props as any)} />)
  return props
}

describe('OnboardingCard', () => {
  // TokenIcon looks up logos over the network.
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })) })

  it('is one card with the three steps and a tour button', () => {
    setup()
    expect(screen.getAllByTestId('personal-onboarding')).toHaveLength(1)
    expect(screen.getByText('Add coins')).toBeTruthy()
    expect(screen.getByText('Follow a wallet')).toBeTruthy()
    expect(screen.getByText('Set an alert')).toBeTruthy()
    expect(screen.getByTestId('onboarding-tour')).toBeTruthy()
  })

  it('states the alert floor on every famous-wallet button', () => {
    setup()
    for (const w of FAMOUS_WALLETS) {
      expect(screen.getByTestId(`onboarding-follow-${w.slug}`).textContent).toMatch(/^Follow · alerts above \$/)
    }
  })

  it('adds a suggested coin and shows the server refusal for an unknown one', async () => {
    const onAddCoin = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'We do not track VITALIK yet.' })
    setup({ onAddCoin })
    await userEvent.click(screen.getByTestId('onboarding-suggest-LINK'))
    expect(onAddCoin).toHaveBeenCalledWith('LINK')
    await userEvent.type(screen.getByTestId('onboarding-coin-input'), 'vitalik{enter}')
    expect(onAddCoin).toHaveBeenLastCalledWith('VITALIK')
    expect((await screen.findByRole('alert')).textContent).toMatch(/VITALIK/)
  })

  it('offers the alert presets, with famous wallets when the user follows none', async () => {
    setup()
    expect(screen.getByTestId('alert-presets-row')).toBeTruthy()
    await userEvent.click(screen.getByTestId('alert-preset-wallet_activity'))
    expect(screen.getByTestId(`alert-preset-chip-${FAMOUS_WALLETS[0].slug}`)).toBeTruthy()
  })

  it('marks a followed wallet as Following', async () => {
    const p = setup()
    const w = FAMOUS_WALLETS[0]
    await userEvent.click(screen.getByTestId(`onboarding-follow-${w.slug}`))
    expect(p.onFollow).toHaveBeenCalledWith(w.slug)
    await waitFor(() => expect(screen.getByTestId(`onboarding-follow-${w.slug}`).textContent).toBe('Following'))
  })
})
