import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  OrcaDrawerProvider,
  useOrcaDrawer,
} from '@/components/orca/useOrcaDrawer'

function wrapper({ children }: { children: React.ReactNode }) {
  return <OrcaDrawerProvider>{children}</OrcaDrawerProvider>
}

describe('useOrcaDrawer', () => {
  it('returns a no-op shape when used outside a Provider (never throws)', () => {
    const { result } = renderHook(() => useOrcaDrawer())
    expect(result.current.state.open).toBe(false)
    expect(typeof result.current.open).toBe('function')
    // Calling open / close on the fallback must not throw.
    act(() => {
      result.current.open({ type: 'ticker', value: 'BTC' })
      result.current.close()
    })
    expect(result.current.state.open).toBe(false)
  })

  it('open() sets open=true and stores the focus + seed', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => {
      result.current.open({ type: 'ticker', value: 'BTC', label: '$BTC' }, 'why is btc up?')
    })
    expect(result.current.state.open).toBe(true)
    expect(result.current.state.focus).toEqual({
      type: 'ticker',
      value: 'BTC',
      label: '$BTC',
    })
    expect(result.current.state.seed).toBe('why is btc up?')
  })

  it('open() without a focus argument preserves the previous focus', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => {
      result.current.open({ type: 'ticker', value: 'ETH' })
    })
    act(() => {
      result.current.close()
    })
    act(() => {
      result.current.open() // no args
    })
    expect(result.current.state.focus).toEqual({ type: 'ticker', value: 'ETH' })
  })

  it('close() resets open + clears seed but preserves focus and pinned', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => {
      result.current.open({ type: 'ticker', value: 'BTC' }, 'seed')
      result.current.pin()
    })
    act(() => result.current.close())
    expect(result.current.state.open).toBe(false)
    expect(result.current.state.seed).toBeNull()
    expect(result.current.state.focus).toEqual({ type: 'ticker', value: 'BTC' })
    expect(result.current.state.pinned).toBe(true)
  })

  it('pin() / unpin() toggle pinned', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    expect(result.current.state.pinned).toBe(false)
    act(() => result.current.pin())
    expect(result.current.state.pinned).toBe(true)
    act(() => result.current.unpin())
    expect(result.current.state.pinned).toBe(false)
  })

  it('setFocus() updates focus independently of open/close', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => result.current.setFocus({ type: 'ticker', value: 'SOL', label: '$SOL' }))
    expect(result.current.state.focus).toMatchObject({ value: 'SOL' })
  })

  it('setSessionId() updates the stored session id', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => result.current.setSessionId('sess-42'))
    expect(result.current.state.sessionId).toBe('sess-42')
  })

  it('clearSeed() drops the seed without changing other state', () => {
    const { result } = renderHook(() => useOrcaDrawer(), { wrapper })
    act(() => result.current.open(null, 'draft'))
    act(() => result.current.clearSeed())
    expect(result.current.state.seed).toBeNull()
    expect(result.current.state.open).toBe(true)
  })
})
