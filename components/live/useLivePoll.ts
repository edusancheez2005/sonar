'use client'
/**
 * useLivePoll — one polling hook for every live surface (Prompts 2 and 6).
 *
 * - Polls `fetcher` every `intervalMs` (default LIVE_POLL_MS); pauses while the
 *   tab is hidden and refreshes on focus / visibilitychange.
 * - AbortController per request plus a sequence guard: a slow old response
 *   can never overwrite a newer one.
 * - Exponential backoff on 5xx / network errors (×2 up to maxBackoffMs).
 * - offsetMs = server clock − client clock (from the response's Date header
 *   plus its Age header), so "4 min ago" labels use server time.
 * - newIds: ids present in this response but not the previous one (when the
 *   caller passes getIds).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export const LIVE_POLL_MS = 15_000

export interface LivePollOptions<T> {
  intervalMs?: number
  maxBackoffMs?: number
  enabled?: boolean
  getIds?: (data: T) => string[]
}

export interface LivePollState<T> {
  data: T | null
  newIds: string[]
  lastFetchedAt: number | null
  offsetMs: number
  error: string | null
  pollsOk: number
  consecutiveFailures: number
  refresh: () => void
}

export function nextBackoff(current: number, base: number, max: number): number {
  return Math.min(max, Math.max(base, current * 2))
}

export function clockOffsetMs(dateHeader: string | null, ageHeader: string | null, clientNow: number): number {
  const server = dateHeader ? Date.parse(dateHeader) : NaN
  if (!Number.isFinite(server)) return 0
  const age = Number(ageHeader) || 0
  return server + age * 1000 - clientNow
}

export function useLivePoll<T = any>(
  fetcher: (signal: AbortSignal) => Promise<Response>,
  opts: LivePollOptions<T> = {}
): LivePollState<T> {
  const intervalMs = opts.intervalMs ?? LIVE_POLL_MS
  const maxBackoffMs = opts.maxBackoffMs ?? 5 * 60_000
  const enabled = opts.enabled !== false
  const [state, setState] = useState<Omit<LivePollState<T>, 'refresh'>>({
    data: null, newIds: [], lastFetchedAt: null, offsetMs: 0, error: null, pollsOk: 0, consecutiveFailures: 0,
  })
  const seq = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delay = useRef(intervalMs)
  const ctrl = useRef<AbortController | null>(null)
  const prevIds = useRef<Set<string>>(new Set())
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const getIdsRef = useRef(opts.getIds)
  getIdsRef.current = opts.getIds

  const schedule = useCallback((ms: number, run: () => void) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(run, ms)
  }, [])

  const tick = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return // resumes on visibilitychange
    const mySeq = ++seq.current
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    try {
      const res = await fetcherRef.current(c.signal)
      if (mySeq !== seq.current) return
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      const body = res.ok ? ((await res.json()) as T) : null
      if (mySeq !== seq.current) return
      const ids = body && getIdsRef.current ? getIdsRef.current(body) : []
      const fresh = ids.filter((id) => !prevIds.current.has(id))
      if (ids.length) prevIds.current = new Set(ids)
      delay.current = intervalMs
      setState((s) => ({
        data: body ?? s.data,
        newIds: s.pollsOk === 0 ? [] : fresh,
        lastFetchedAt: res.ok ? Date.now() : s.lastFetchedAt,
        offsetMs: clockOffsetMs(res.headers.get('date'), res.headers.get('age'), Date.now()),
        error: res.ok ? null : `HTTP ${res.status}`,
        pollsOk: s.pollsOk + (res.ok ? 1 : 0),
        consecutiveFailures: res.ok ? 0 : s.consecutiveFailures + 1,
      }))
    } catch (e: any) {
      if (c.signal.aborted || mySeq !== seq.current) return
      delay.current = nextBackoff(delay.current, intervalMs, maxBackoffMs)
      setState((s) => ({ ...s, error: String(e?.message || e), consecutiveFailures: s.consecutiveFailures + 1 }))
    } finally {
      if (mySeq === seq.current) schedule(delay.current, tick)
    }
  }, [intervalMs, maxBackoffMs, schedule])

  useEffect(() => {
    if (!enabled) return
    tick()
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (timer.current) clearTimeout(timer.current)
      ctrl.current?.abort()
      seq.current++
    }
  }, [enabled, tick])

  return { ...state, refresh: tick }
}

export default useLivePoll
