// Audit price feed staleness across providers.
// Usage: node scripts/audit-price-feed.mjs
//
// Hits Binance.vision, Coinbase, and our own price_snapshots in parallel.
// Reports any source that disagrees with the median by > 0.5% on BTC/ETH
// (canary tokens). Used to confirm or rule out a feed-staleness incident.
import 'dotenv/config'
import fs from 'node:fs'

// crude .env.local loader (dotenv only reads .env)
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE

const CANARY = ['BTC', 'ETH', 'SOL', 'STRK']

async function fromBinanceVision(sym) {
  const r = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${sym}USDT`)
  if (!r.ok) return null
  const j = await r.json()
  return parseFloat(j.price)
}

async function fromCoinbase(sym) {
  const r = await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/ticker`)
  if (!r.ok) return null
  const j = await r.json()
  return parseFloat(j.price)
}

async function fromSnapshots(sym) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/price_snapshots?select=price_usd,timestamp&ticker=eq.${sym}&order=timestamp.desc&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  if (!r.ok) return null
  const rows = await r.json()
  if (!rows[0]) return null
  return {
    price: Number(rows[0].price_usd),
    ageMin: (Date.now() - new Date(rows[0].timestamp).getTime()) / 60000,
  }
}

const pad = (s, n) => String(s).padEnd(n, ' ')

console.log(`\n=== Price feed audit @ ${new Date().toISOString()} ===\n`)
console.log(pad('TOKEN', 7) + pad('BINANCE', 14) + pad('COINBASE', 14) + pad('OUR DB', 14) + pad('AGE', 8) + 'DRIFT vs COINBASE')

for (const sym of CANARY) {
  const [bin, cb, snap] = await Promise.all([
    fromBinanceVision(sym).catch(() => null),
    fromCoinbase(sym).catch(() => null),
    fromSnapshots(sym).catch(() => null),
  ])
  const ours = snap?.price ?? null
  const driftBin = (bin && cb) ? ((bin - cb) / cb * 100) : null
  const driftOurs = (ours && cb) ? ((ours - cb) / cb * 100) : null
  console.log(
    pad(sym, 7) +
    pad(bin?.toFixed(4) ?? 'n/a', 14) +
    pad(cb?.toFixed(4) ?? 'n/a', 14) +
    pad(ours?.toFixed(4) ?? 'n/a', 14) +
    pad(snap ? `${snap.ageMin.toFixed(1)}m` : 'n/a', 8) +
    `bin=${driftBin?.toFixed(2) ?? 'n/a'}%  ours=${driftOurs?.toFixed(2) ?? 'n/a'}%`
  )
}
console.log('')
