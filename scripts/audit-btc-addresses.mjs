// Audit curated_entities for placeholder/fabricated BTC addresses.
// A real Bitcoin address has on-chain history. Fake ones return empty
// from mempool.space. We hit mempool.space directly here (no Sonar
// cache) so the audit is independent of what the figure page renders.
import 'dotenv/config'
try { (await import('dotenv')).default.config({ path: '.env.local' }) } catch {}
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('curated_entities')
  .select('slug,display_name,addresses')
  .eq('submission_status', 'approved')

if (error) { console.error(error); process.exit(1) }

const rowsWithBtc = []
for (const r of data || []) {
  const btc = (r.addresses || []).filter(a => a?.chain === 'bitcoin')
  if (btc.length) rowsWithBtc.push({ slug: r.slug, name: r.display_name, btc })
}
console.log(`Curated entities with bitcoin addresses: ${rowsWithBtc.length}\n`)

for (const row of rowsWithBtc) {
  for (const a of row.btc) {
    let status = 'UNKNOWN'
    let txCount = null
    try {
      const res = await fetch(`https://mempool.space/api/address/${a.address}`)
      if (res.status === 400) status = 'INVALID ADDRESS'
      else if (!res.ok) status = `HTTP ${res.status}`
      else {
        const j = await res.json()
        txCount = (j?.chain_stats?.tx_count || 0) + (j?.mempool_stats?.tx_count || 0)
        status = txCount > 0 ? `OK (${txCount} txs)` : 'EMPTY (0 txs)'
      }
    } catch (e) {
      status = `ERR: ${e.message}`
    }
    console.log(`  ${row.slug.padEnd(22)} ${a.address.padEnd(50)} ${status}`)
    await new Promise(r => setTimeout(r, 250))
  }
}
