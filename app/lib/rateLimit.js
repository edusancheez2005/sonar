const windows = new Map()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of windows) {
    const fresh = timestamps.filter(t => t > now - 120000)
    if (fresh.length === 0) windows.delete(key)
    else windows.set(key, fresh)
  }
}, 300000)

/**
 * Sliding window rate limiter
 * @param {string} key - Unique key (e.g. IP + route)
 * @param {number} max - Max requests per window
 * @param {number} windowMs - Window duration in ms
 * @returns {{ allowed: boolean, remaining: number, retryAfter?: number }}
 */
export function rateLimit(key, max = 60, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  if (!windows.has(key)) windows.set(key, [])
  const timestamps = windows.get(key).filter(t => t > windowStart)
  if (timestamps.length >= max) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }
  timestamps.push(now)
  windows.set(key, timestamps)
  return { allowed: true, remaining: max - timestamps.length }
}

/** Legacy compat */
export function checkRate(ip, windowMs = 60000, max = 10) {
  return rateLimit(ip, max, windowMs).allowed
}

/** Helper to get client IP from Next.js request */
export function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Helper to return a 429 response */
export function rateLimitResponse(retryAfter = 60) {
  return new Response(
    JSON.stringify({ error: 'Too many requests', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
} 