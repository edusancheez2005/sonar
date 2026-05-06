// Diagnose why our price_snapshots are stale.
// Pulls last fetch-prices system_health rows + last few price_snapshots
// for BTC to identify whether the cron is failing silently OR succeeding
// while writing the wrong value.
import fs from 'node:fs'
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const j = (path) => fetch(`${URL}${path}`, { headers: H }).then(r => r.json())

const [health, btcSnaps, lastSig] = await Promise.all([
  j('/rest/v1/system_health?component=eq.fetch-prices&order=started_at.desc&limit=8'),
  j('/rest/v1/price_snapshots?ticker=eq.BTC&select=price_usd,timestamp&order=timestamp.desc&limit=10'),
  j('/rest/v1/token_signals?select=computed_at,token,signal,score&order=computed_at.desc&limit=5'),
])

console.log('=== system_health: fetch-prices (last 8) ===')
for (const h of (Array.isArray(health) ? health : [health])) {
  if (!h?.started_at) { console.log(JSON.stringify(h)); continue }
  const det = h.details ? JSON.stringify(h.details).slice(0, 200) : ''
  console.log(`${h.started_at}  status=${h.status}  ${h.duration_ms}ms  ${det}`)
}

console.log('\n=== price_snapshots BTC (last 10) ===')
for (const s of (btcSnaps || [])) {
  console.log(`${s.timestamp}  $${s.price_usd}`)
}

console.log('\n=== token_signals (last 5) ===')
for (const s of (lastSig || [])) {
  console.log(`${s.computed_at}  ${s.token.padEnd(8)} ${s.signal.padEnd(12)} ${s.score}`)
}
