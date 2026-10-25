/**
 * Merge freshly polled rows into the rows on screen: newest first, no
 * duplicates, capped. `newIds` are the keys that were not on screen before
 * (for a one-off highlight); rows pushed past the cap are not reported.
 */
export function mergeRows<T extends Record<string, any>>(
  prev: T[],
  incoming: T[],
  cap: number,
  key: (r: T) => string = (r) => r.transaction_hash
): { rows: T[]; newIds: string[] } {
  const seen = new Set(prev.map(key))
  const fresh: T[] = []
  for (const r of incoming) {
    const k = key(r)
    if (!k || seen.has(k)) continue
    seen.add(k)
    fresh.push(r)
  }
  if (fresh.length === 0) return { rows: prev.slice(0, cap), newIds: [] }
  const ts = (r: T) => {
    const t = Date.parse(r.timestamp)
    return Number.isFinite(t) ? t : 0
  }
  const rows = [...fresh, ...prev].sort((a, b) => ts(b) - ts(a)).slice(0, cap)
  const kept = new Set(rows.map(key))
  return { rows, newIds: fresh.map(key).filter((k) => kept.has(k)) }
}

/** Round an instant down to a 10 s boundary so open tabs share edge-cache keys. */
export function roundDownIso(ms: number, stepMs = 10_000): string {
  return new Date(Math.floor(ms / stepMs) * stepMs).toISOString()
}
