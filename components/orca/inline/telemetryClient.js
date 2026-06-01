'use client'
// Fire-and-forget client-side telemetry. No-op in dev. Never throws.
export function logTileEvent(event, meta = {}) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') return
  try {
    void fetch('/api/orca/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, meta, t: Date.now() }),
      keepalive: true,
    })
  } catch { /* ignore */ }
}
