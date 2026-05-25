import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import OrcaDrawer from '@/components/orca/OrcaDrawer'
import {
  OrcaDrawerProvider,
  useOrcaDrawer,
} from '@/components/orca/useOrcaDrawer'

// Helper that exposes the imperative hook to the test through a click button.
function ExposeHook({ children }: { children: (api: ReturnType<typeof useOrcaDrawer>) => React.ReactNode }) {
  const api = useOrcaDrawer()
  return <>{children(api)}</>
}

function renderDrawer() {
  let api: ReturnType<typeof useOrcaDrawer> | null = null
  const utils = render(
    <OrcaDrawerProvider>
      <ExposeHook>
        {(a) => {
          api = a
          return null
        }}
      </ExposeHook>
      <OrcaDrawer />
    </OrcaDrawerProvider>
  )
  return { ...utils, getApi: () => api! }
}

describe('OrcaDrawer', () => {
  it('does not render anything until it has been opened at least once', () => {
    const { container } = renderDrawer()
    expect(container.querySelector('[data-testid="orca-drawer"]')).toBeNull()
  })

  it('renders the panel with Pin and Close controls after open()', async () => {
    const { getApi } = renderDrawer()
    act(() => {
      getApi().open({ type: 'ticker', value: 'BTC', label: '$BTC' })
    })
    expect(screen.getByTestId('orca-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('orca-drawer')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('orca-drawer-pin')).toBeInTheDocument()
    expect(screen.getByTestId('orca-drawer-close')).toBeInTheDocument()
  })

  it('forwards the open focus into the conversation atom (Pinned chip visible)', async () => {
    const { getApi } = renderDrawer()
    act(() => {
      getApi().open({ type: 'ticker', value: 'BTC', label: '$BTC' })
    })
    expect(screen.getByTestId('orca-conv-focus').textContent).toMatch(/\$BTC/)
  })

  it('Close button closes the drawer (data-open=false)', async () => {
    const { getApi } = renderDrawer()
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    await userEvent.click(screen.getByTestId('orca-drawer-close'))
    expect(screen.getByTestId('orca-drawer')).toHaveAttribute('data-open', 'false')
  })

  it('Esc key closes the drawer when open and unpinned', () => {
    const { getApi } = renderDrawer()
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(getApi().state.open).toBe(false)
  })

  it('Pin button toggles the pinned state and aria-pressed reflects it', async () => {
    const { getApi } = renderDrawer()
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    const pin = screen.getByTestId('orca-drawer-pin')
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(pin)
    expect(pin.getAttribute('aria-pressed')).toBe('true')
    expect(pin.textContent).toMatch(/pinned/i)
    expect(getApi().state.pinned).toBe(true)
  })

  it('contains no emojis in any built-in copy', () => {
    const { getApi, container } = renderDrawer()
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    const text = container.textContent || ''
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
  })
})
