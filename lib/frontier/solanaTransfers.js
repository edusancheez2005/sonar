/**
 * Index-friendly reads of Solana rows in tracked_address_transfers.
 * =============================================================================
 * tracked_address_transfers is 10M+ rows and only indexed by (address,
 * timestamp). The Frontier routes filtered it by chain='solana' + timestamp,
 * which is a full scan → statement timeout → /api/frontier/pulse returned
 * HTTP 500 and the page showed "Solana ingestion warming up" with dashes
 * (2026-10-01). We now take the tracked Solana address list from
 * tracked_address_universe (~190 rows) and query transfers per address chunk,
 * which hits the index and returns in well under a second.
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const CHUNK = 40

export async function getSolanaUniverse() {
  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('address, arkham_entity_name, arkham_entity_type')
    .eq('chain', 'solana')
    .limit(1000)
  if (error) throw new Error(`universe: ${error.message}`)
  return data || []
}

/**
 * @param {object} opts
 * @param {string}   opts.select     columns to select
 * @param {string}   [opts.sinceIso] lower bound on timestamp (omit for "latest N regardless of age")
 * @param {number}   [opts.perChunk] rows per address chunk
 * @param {number}   [opts.limit]    total rows after merge (newest first)
 * @param {string}   [opts.direction] optional 'in' | 'out'
 * @param {string[]} [opts.addresses] optional pre-fetched universe addresses
 */
export async function fetchSolanaTransfers({ select, sinceIso, perChunk = 1000, limit = 5000, direction, addresses }) {
  const addrs = addresses || (await getSolanaUniverse()).map((r) => r.address).filter(Boolean)
  if (addrs.length === 0) return { rows: [], addresses: addrs, errors: [] }
  const chunks = []
  for (let i = 0; i < addrs.length; i += CHUNK) chunks.push(addrs.slice(i, i + CHUNK))
  const errors = []
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      let q = supabaseAdmin
        .from('tracked_address_transfers')
        .select(select)
        .in('address', chunk)
        .order('timestamp', { ascending: false })
        .limit(perChunk)
      if (sinceIso) q = q.gte('timestamp', sinceIso)
      if (direction) q = q.eq('direction', direction)
      const { data, error } = await q
      if (error) { errors.push(error.message); return [] }
      return data || []
    })
  )
  const rows = results.flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
  return { rows, addresses: addrs, errors }
}
