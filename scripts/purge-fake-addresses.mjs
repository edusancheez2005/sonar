// Purge invalid/fake addresses from curated_entities.
// Strategy:
//   - For each fake-address slug, drop the bad address from the JSONB array
//   - If that empties the array, the figure disappears from /figures
//     (which is the right behavior — we don't want to show a verified
//     figure with no real on-chain data)
import 'dotenv/config'
try { (await import('dotenv')).default.config({ path: '.env.local' }) } catch {}
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
)

// Specific (slug, address) pairs that the BTC audit confirmed are
// either invalid bech32 or empty placeholder addresses. Removing the
// address only — the row itself stays so the slug isn't reused.
const FAKES = [
  { slug: 'el-salvador',    address: 'bc1ql4r6m5lf5fmz9lenjzx3kyaqmrdfcl2g6xcpd5' },
  { slug: 'blackrock-ibit', address: 'bc1ql7yu0f6cz73h3pjsjf4xq2x9q39q60yqfrl4eq' },
]

for (const { slug, address } of FAKES) {
  const { data: row, error: e1 } = await supabase
    .from('curated_entities')
    .select('slug, addresses')
    .eq('slug', slug)
    .maybeSingle()
  if (e1 || !row) { console.log(`✗ ${slug}: not found (${e1?.message || 'no row'})`); continue }
  const before = (row.addresses || []).length
  const next = (row.addresses || []).filter(a => a?.address !== address)
  const after = next.length
  if (before === after) { console.log(`- ${slug}: address ${address} not present (no-op)`); continue }
  const { error: e2 } = await supabase
    .from('curated_entities')
    .update({ addresses: next })
    .eq('slug', slug)
  if (e2) { console.log(`✗ ${slug}: update failed: ${e2.message}`); continue }
  console.log(`✓ ${slug}: removed ${address} (${before} → ${after})`)
}
