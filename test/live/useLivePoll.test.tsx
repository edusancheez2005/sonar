import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLivePoll, nextBackoff, clockOffsetMs, LIVE_POLL_MS } from '@/components/live/useLivePoll'

function res(status: number, body: any = {}, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as any as Response
}

describe('nextBackoff', () => {
  it('doubles from the base and stops at the cap', () => {
    expect(nextBackoff(60_000, 60_000, 300_000)).toBe(120_000)
    expect(nextBackoff(120_000, 60_000, 300_000)).toBe(240_000)
    expect(nextBackoff(240_000, 60_000, 300_000)).toBe(300_000)
    expect(nextBackoff(0, 60_000, 300_000)).toBe(60_000)
  })
})

describe('clockOffsetMs', () => {
  it('adds the cache age to the server date', () => {
    const client = Date.parse('2026-10-25T12:00:00Z')
    expect(clockOffsetMs('Sun, 25 Oct 2026 12:00:10 GMT', '5', client)).toBe(15_000)
  })
  it('is 0 without a usable Date header', () => {
    expect(clockOffsetMs(null, '5', 0)).toBe(0)
    expect(clockOffsetMs('nonsense', null, 0)).toBe(0)
  })
})

describe('useLivePoll', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  })

  it('defaults to a 15 s interval', () => {
    expect(LIVE_POLL_MS).toBe(15_000)
  })

  it('fetches on mount and again after the interval', async () => {
    const fetcher = vi.fn().mockResolvedValue(res(200, { n: 1 }))
    const { result } = renderHook(() => useLivePoll(fetcher, { intervalMs: 60_000 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ n: 1 })
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not poll while the tab is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    const fetcher = vi.fn().mockResolvedValue(res(200, {}))
    renderHook(() => useLivePoll(fetcher, { intervalMs: 60_000 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000) })
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('backs off after a 5xx and keeps the last good data', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(res(200, { n: 1 }))
      .mockResolvedValue(res(503))
    const { result } = renderHook(() => useLivePoll(fetcher, { intervalMs: 60_000, maxBackoffMs: 300_000 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual({ n: 1 })
    expect(result.current.consecutiveFailures).toBe(1)
    // The next attempt waits 120 s, not 60 s.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
