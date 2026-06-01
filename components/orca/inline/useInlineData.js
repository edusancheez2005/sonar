'use client'
// Tiny SWR-lite hook. Module-scoped Map (capped at 200 LRU). Dedupes
// in-flight fetches by key. Silent-failure: returns { data: null, error: true }
// rather than throwing.
import { useEffect, useState } from 'react'

const CACHE_TTL_MS = 60_000
const MAX_ENTRIES = 200
const cache = new Map() // key -> { ts, data }
const inflight = new Map() // key -> Promise

function lruTouch(key, value) {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
}

export function readCache(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.data
}

export function useInlineData(key, fetcher, { enabled = true } = {}) {
  const cached = enabled ? readCache(key) : null
  const [state, setState] = useState({
    data: cached,
    loading: enabled && !cached,
    error: false,
  })

  useEffect(() => {
    if (!enabled || !key) return
    const hit = readCache(key)
    if (hit) {
      setState({ data: hit, loading: false, error: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: false }))
    let p = inflight.get(key)
    if (!p) {
      p = (async () => {
        try {
          const data = await fetcher()
          lruTouch(key, { ts: Date.now(), data })
          return data
        } finally {
          inflight.delete(key)
        }
      })()
      inflight.set(key, p)
    }
    p.then(
      (data) => { if (!cancelled) setState({ data, loading: false, error: false }) },
      () => { if (!cancelled) setState({ data: null, loading: false, error: true }) }
    )
    return () => { cancelled = true }
  }, [key, enabled])

  return state
}

// Test-only helper.
export function __clearInlineDataCache() {
  cache.clear()
  inflight.clear()
}
