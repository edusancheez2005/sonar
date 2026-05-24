/// <reference types="vitest" />
/**
 * Locked-decision contract test for §7.4: this PR ships the trading
 * "coming soon" surface as a STATIC PLACEHOLDER with NO email capture.
 * If a future PR adds a form, this test must be updated AND the
 * locked-decision row in §7 of ORCA_COPILOT_BUILD_PROMPT.md updated too.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import TradingComingSoon, {
  TRADING_COMING_SOON_DISCLAIMER,
  TRADING_COMING_SOON_TITLE,
  TRADING_COMING_SOON_BODY,
} from '../../components/trading/TradingComingSoon'

describe('TradingComingSoon', () => {
  it('renders the exact regulatory disclaimer string verbatim', () => {
    render(<TradingComingSoon />)
    expect(
      screen.getByTestId('trading-coming-soon-disclaimer')
    ).toHaveTextContent(TRADING_COMING_SOON_DISCLAIMER)
  })

  it('renders the title and body copy', () => {
    render(<TradingComingSoon />)
    expect(screen.getByTestId('trading-coming-soon-title')).toHaveTextContent(
      TRADING_COMING_SOON_TITLE
    )
    expect(screen.getByText(TRADING_COMING_SOON_BODY)).toBeInTheDocument()
  })

  it('LOCKED §7.4: does NOT render any email input, form, or "Notify me" CTA', () => {
    const { container } = render(<TradingComingSoon />)
    // Form / input / button are all forbidden until Saif gives a ship date.
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('[type="email"]')).toBeNull()
    expect(container.textContent || '').not.toMatch(/Notify me/i)
  })

  it('makes it clear that the waitlist is not yet open', () => {
    render(<TradingComingSoon />)
    expect(screen.getByTestId('trading-coming-soon-status')).toHaveTextContent(
      /waitlist not yet open/i
    )
  })

  it('marks the disclaimer with role=note for assistive tech', () => {
    render(<TradingComingSoon />)
    const note = screen.getByTestId('trading-coming-soon-disclaimer')
    expect(note).toHaveAttribute('role', 'note')
  })

  it('disclaimer text mentions broker/dealer/adviser disclaimer keywords', () => {
    expect(TRADING_COMING_SOON_DISCLAIMER).toMatch(/research and information tool/i)
    expect(TRADING_COMING_SOON_DISCLAIMER).toMatch(/not a broker, dealer, or investment adviser/i)
    expect(TRADING_COMING_SOON_DISCLAIMER).toMatch(/separately authorised entity/i)
  })

  it('exposes a stable data-testid for both variants', () => {
    const { rerender } = render(<TradingComingSoon variant="page" />)
    expect(screen.getByTestId('trading-coming-soon')).toBeInTheDocument()
    rerender(<TradingComingSoon variant="panel" />)
    expect(screen.getByTestId('trading-coming-soon')).toBeInTheDocument()
  })
})
