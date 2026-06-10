// Tiny in-process stale-while-revalidate cache for read-heavy API routes.
//
// Why: route handlers under `next start` are not cached, and the
// `Cache-Control: s-maxage` headers we set only help when a CDN sits in
// front. Several whale endpoints hit large Supabase tables (signals,
// candles, sparklines, leaderboard) and were re-running multi-second
// queries on every 30s poll and every navigation. This memoizes the
// result per cache key:
//   - fresh  (age < ttl)        -> return cached immediately
//   - stale  (ttl..ttl+swr)     -> return cached now, refresh in background
//   - cold   (missing/expired)  -> await the fetcher once (single-flight)
//
// Single-flight de-dupes concurrent misses so a burst of requests for the
// same key triggers exactly one DB round-trip. Memory is bounded by TTLs
// and a periodic sweep; values are small JSON blobs.

const store = new Map() // key -> { value, at, ttl, swr }
const inflight = new Map() // key -> Promise

const SWEEP_MS = 5 * 60 * 1000
let sweeper = null
function ensureSweeper() {
  if (sweeper) return
  sweeper = setInterval(() => {
    const now = Date.now()
    for (const [k, e] of store) {
      if (now - e.at > e.ttl + e.swr) store.delete(k)
    }
  }, SWEEP_MS)
  // Don't keep the event loop alive just for the sweeper.
  if (typeof sweeper.unref === 'function') sweeper.unref()
}

/**
 * @param {string} key            unique cache key (include all query params)
 * @param {() => Promise<any>} fetcher  produces the value on a miss
 * @param {object} [opts]
 * @param {number} [opts.ttl=20000]  ms the value is served without refresh
 * @param {number} [opts.swr=60000]  ms past ttl the value is still served
 *                                   while a background refresh runs
 */
export async function cached(key, fetcher, { ttl = 20000, swr = 60000 } = {}) {
  ensureSweeper()
  const now = Date.now()
  const entry = store.get(key)

  if (entry) {
    const age = now - entry.at
    if (age < ttl) return entry.value // fresh
    if (age < ttl + swr) {
      // stale: serve now, refresh in the background (single-flight)
      if (!inflight.has(key)) {
        const p = Promise.resolve()
          .then(fetcher)
          .then((value) => {
            store.set(key, { value, at: Date.now(), ttl, swr })
            return value
          })
          .catch(() => {})
          .finally(() => inflight.delete(key))
        inflight.set(key, p)
      }
      return entry.value
    }
  }

  // cold or fully expired: await a single shared fetch
  if (inflight.has(key)) return inflight.get(key)
  const p = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      store.set(key, { value, at: Date.now(), ttl, swr })
      return value
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** Drop a key (or everything) — handy if a write should invalidate reads. */
export function invalidate(key) {
  if (key == null) store.clear()
  else store.delete(key)
}
