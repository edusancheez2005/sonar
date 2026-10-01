/**
 * Index-friendly reads of Solana rows in tracked_address_transfers.
 * =============================================================================
 * tracked_address_transfers is 10M+ rows and only indexed by (address,
 * timestamp). Measured 2026-10-01 against all 186 tracked Solana addresses:
 *   - one address + time bound + ORDER BY timestamp DESC LIMIT n → 0.5s median,
 *     7.5s worst, zero timeouts;
 *   - `address IN (40 …)` → the planner drops the index path for some chunks
 *     and hits the statement timeout, even with a time bound;
 *   - chain='solana' + timestamp (no address) → always a full scan → timeout
 *     (that was /api/frontier/pulse's HTTP 500).
 * So: one query per address, run with bounded concurrency, always time-bounded,
 * merged newest-first. Callers wrap the result in a short app_cache TTL
 * (lib/frontier/cache.js) so a page polling every 15s does not re-run ~190
 * queries per viewer.
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { cachedPayload } from './cache'

const CONCURRENCY = 24
const CACHE_TTL_MS = 60_000

export async function getSolanaUniverse() {
  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('address, arkham_entity_name, arkham_entity_type')
    .eq('chain', 'solana')
    .limit(1000)
  if (error) throw new Error(`universe: ${error.message}`)
  return data || []
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * @param {object} opts
 * @param {string}   opts.select        columns to select
 * @param {string}   opts.sinceIso      lower bound on timestamp (REQUIRED — unbounded reads time out)
 * @param {number}   [opts.perAddress]  rows per address (newest first)
 * @param {number}   [opts.limit]       total rows after merge (newest first)
 * @param {string}   [opts.direction]   optional 'in' | 'out'
 * @param {string[]} [opts.addresses]   optional pre-fetched universe addresses
 */
export async function fetchSolanaTransfers({ select, sinceIso, perAddress = 200, limit = 5000, direction, addresses, perChunk }) {
  const addrs = addresses || (await getSolanaUniverse()).map((r) => r.address).filter(Boolean)
  if (addrs.length === 0) return { rows: [], addresses: addrs, errors: [] }
  const since = sinceIso || new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
  const per = Math.max(1, Math.min(perAddress, perChunk || perAddress))
  // Cache key: the query shape + the lower bound rounded to the minute.
  const sinceBucket = new Date(Math.floor(Date.parse(since) / 60_000) * 60_000).toISOString()
  const key = `frontier_rows:${[select.length, direction || '', per, limit, sinceBucket, addrs.length].join(':')}`
  const { payload } = await cachedPayload(key, CACHE_TTL_MS, () => fetchUncached({ select, since, per, limit, direction, addrs }))
  return payload
}

async function fetchUncached({ select, since, per, limit, direction, addrs }) {
  const errors = []
  const results = await mapLimit(addrs, CONCURRENCY, async (address) => {
    let q = supabaseAdmin
      .from('tracked_address_transfers')
      .select(select)
      .eq('address', address)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(per)
    if (direction) q = q.eq('direction', direction)
    const { data, error } = await q
    if (error) { errors.push(`${address.slice(0, 6)}: ${error.message}`); return [] }
    return data || []
  })
  const rows = results.flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
  return { rows, addresses: addrs, errors }
}
