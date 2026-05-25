import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import OrcaLauncher, {
  shouldRenderLauncher,
  isTypingTarget,
  isLauncherChord,
} from '@/components/orca/OrcaLauncher'
import { OrcaDrawerProvider, useOrcaDrawer } from '@/components/orca/useOrcaDrawer'

// Mock next/navigation usePathname — return what tests set on this ref.
let mockPathname = '/dashboard/personal'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

function ExposeApi({ onApi }: { onApi: (api: ReturnType<typeof useOrcaDrawer>) => void }) {
  const api = useOrcaDrawer()
  onApi(api)
  return null
}

function renderLauncher(pathname = '/dashboard/personal') {
  mockPathname = pathname
  let api: ReturnType<typeof useOrcaDrawer> | null = null
  const utils = render(
    <OrcaDrawerProvider>
      <ExposeApi onApi={(a) => (api = a)} />
      <OrcaLauncher />
    </OrcaDrawerProvider>
  )
  return { ...utils, getApi: () => api! }
}

describe('OrcaLauncher — pure helpers', () => {
  describe('shouldRenderLauncher', () => {
    it('hides on /auth and any /auth/* path', () => {
      expect(shouldRenderLauncher('/auth')).toBe(false)
      expect(shouldRenderLauncher('/auth/login')).toBe(false)
      expect(shouldRenderLauncher('/auth/callback?code=1')).toBe(false)
    })
    it('hides on /orca and any /orca/* path', () => {
      expect(shouldRenderLauncher('/orca')).toBe(false)
      expect(shouldRenderLauncher('/orca/session-123')).toBe(false)
    })
    it('renders on every other route', () => {
      expect(shouldRenderLauncher('/')).toBe(true)
      expect(shouldRenderLauncher('/dashboard/personal')).toBe(true)
      expect(shouldRenderLauncher('/token/btc')).toBe(true)
      expect(shouldRenderLauncher('/auth-bypass-typo')).toBe(true) // not the prefix
    })
  })

  describe('isTypingTarget', () => {
    it('returns true for input, textarea, select, contenteditable', () => {
      expect(isTypingTarget({ tagName: 'INPUT' } as any)).toBe(true)
      expect(isTypingTarget({ tagName: 'textarea' } as any)).toBe(true)
      expect(isTypingTarget({ tagName: 'SELECT' } as any)).toBe(true)
      expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as any)).toBe(true)
    })
    it('returns false for plain elements and bad input', () => {
      expect(isTypingTarget({ tagName: 'DIV' } as any)).toBe(false)
      expect(isTypingTarget(null as any)).toBe(false)
    })
  })

  describe('isLauncherChord', () => {
    it('recognises Cmd+K and Ctrl+K (case-insensitive)', () => {
      expect(isLauncherChord({ key: 'k', metaKey: true } as any)).toBe(true)
      expect(isLauncherChord({ key: 'K', ctrlKey: true } as any)).toBe(true)
    })
    it('rejects plain K (no modifier) and other keys', () => {
      expect(isLauncherChord({ key: 'k' } as any)).toBe(false)
      expect(isLauncherChord({ key: 'j', metaKey: true } as any)).toBe(false)
      expect(isLauncherChord(null as any)).toBe(false)
    })
  })
})

describe('OrcaLauncher — UI', () => {
  beforeEach(() => {
    mockPathname = '/dashboard/personal'
  })

  it('renders the floating button on a normal route', () => {
    renderLauncher('/dashboard/personal')
    expect(screen.getByTestId('orca-launcher-fab')).toBeInTheDocument()
  })

  it('does not render on /auth/*', () => {
    renderLauncher('/auth/login')
    expect(screen.queryByTestId('orca-launcher-fab')).toBeNull()
  })

  it('does not render on /orca', () => {
    renderLauncher('/orca')
    expect(screen.queryByTestId('orca-launcher-fab')).toBeNull()
  })

  it('clicking the FAB opens the drawer state', async () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    expect(getApi().state.open).toBe(false)
    await userEvent.click(screen.getByTestId('orca-launcher-fab'))
    expect(getApi().state.open).toBe(true)
  })

  it('Ctrl+K opens the drawer', () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })
    expect(getApi().state.open).toBe(true)
  })

  it('Cmd+K (metaKey) also opens the drawer', () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
    })
    expect(getApi().state.open).toBe(true)
  })

  it('Ctrl+K with focus inside an input does NOT open the drawer', () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    const input = document.createElement('input')
    document.body.appendChild(input)
    act(() => {
      fireEvent.keyDown(input, { key: 'k', ctrlKey: true })
    })
    expect(getApi().state.open).toBe(false)
    document.body.removeChild(input)
  })

  it('Ctrl+K with the drawer already open closes it (toggle)', () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    expect(getApi().state.open).toBe(true)
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })
    expect(getApi().state.open).toBe(false)
  })

  it('"?" key opens the keyboard-help overlay; Esc closes it', () => {
    renderLauncher('/dashboard/personal')
    act(() => fireEvent.keyDown(document, { key: '?' }))
    expect(screen.getByTestId('orca-launcher-help')).toBeInTheDocument()
    act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    expect(screen.queryByTestId('orca-launcher-help')).toBeNull()
  })

  it('"?" key does NOT open help while the drawer is open (Esc closes the drawer instead)', () => {
    const { getApi } = renderLauncher('/dashboard/personal')
    act(() => getApi().open({ type: 'ticker', value: 'BTC' }))
    act(() => fireEvent.keyDown(document, { key: '?' }))
    expect(screen.queryByTestId('orca-launcher-help')).toBeNull()
    act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    expect(getApi().state.open).toBe(false)
  })

  it('contains no emojis in any UI string', () => {
    renderLauncher('/dashboard/personal')
    act(() => fireEvent.keyDown(document, { key: '?' }))
    const text = (screen.getByTestId('orca-launcher-help').textContent || '') +
      (screen.getByTestId('orca-launcher-fab').textContent || '')
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
  })
})
