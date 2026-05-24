import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { useState } from 'react'
import Tray from '@/components/personal/Tray'

function Harness() {
  const [open, setOpen] = useState(null as any)
  return <Tray open={open} onChange={setOpen} />
}

describe('Tray', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders three drawer toggle buttons collapsed by default', () => {
    render(<Tray open={null} onChange={() => {}} />)
    expect(screen.getByTestId('tray-trading')).toBeInTheDocument()
    expect(screen.getByTestId('tray-memory')).toBeInTheDocument()
    expect(screen.getByTestId('tray-settings')).toBeInTheDocument()
    expect(screen.queryByTestId('tray-drawer-trading')).toBeNull()
    expect(screen.queryByTestId('tray-drawer-memory')).toBeNull()
    expect(screen.queryByTestId('tray-drawer-settings')).toBeNull()
  })

  it('clicking a button opens the matching drawer', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByTestId('tray-memory'))
    expect(screen.getByTestId('tray-drawer-memory')).toBeInTheDocument()
    expect(screen.getByTestId('tray-memory').getAttribute('aria-expanded')).toBe('true')
  })

  it('opening a second drawer closes the first', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByTestId('tray-memory'))
    await userEvent.click(screen.getByTestId('tray-settings'))
    expect(screen.queryByTestId('tray-drawer-memory')).toBeNull()
    expect(screen.getByTestId('tray-drawer-settings')).toBeInTheDocument()
  })

  it('clicking the same button twice toggles the drawer closed', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByTestId('tray-memory'))
    await userEvent.click(screen.getByTestId('tray-memory'))
    expect(screen.queryByTestId('tray-drawer-memory')).toBeNull()
  })

  it('ESC closes any open drawer', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByTestId('tray-settings'))
    expect(screen.getByTestId('tray-drawer-settings')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('tray-drawer-settings')).toBeNull()
  })

  it('trading drawer mounts the TradingComingSoon panel (locked surface)', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByTestId('tray-trading'))
    const drawer = screen.getByTestId('tray-drawer-trading')
    // TradingComingSoon uses data-testid="trading-coming-soon"
    expect(drawer.querySelector('[data-testid="trading-coming-soon"]')).toBeTruthy()
  })

  it('contains no emojis', () => {
    const { container } = render(<Tray open="memory" onChange={() => {}} />)
    expect(/\p{Extended_Pictographic}/u.test(container.textContent || '')).toBe(false)
  })
})
