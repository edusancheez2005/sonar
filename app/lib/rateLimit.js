const hits = new Map()
export function checkRate(ip, windowMs = 60000, max = 10) {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.ts > windowMs) {
    hits.set(ip, { count: 1, ts: now })
    return true
  }
  if (rec.count >= max) return false
  rec.count++
  return true
} 