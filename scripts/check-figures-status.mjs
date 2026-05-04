import 'dotenv/config'
try { (await import('dotenv')).default.config({ path: '.env.local' }) } catch {}
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('curated_entities')
  .select('slug,submission_status,addresses,is_featured')
  .order('slug', { ascending: true })

if (error) { console.error(error); process.exit(1) }

console.log(`Total rows: ${data.length}`)
const byStatus = {}
for (const r of data) {
  const k = r.submission_status ?? '(null)'
  byStatus[k] = (byStatus[k] || 0) + 1
}
console.log('By status:', byStatus)
const withAddrs = data.filter(r => Array.isArray(r.addresses) && r.addresses.length > 0)
console.log(`With addresses (>0): ${withAddrs.length}`)
const visible = withAddrs.filter(r => r.submission_status === 'approved')
console.log(`Visible on /figures (approved + has-addrs): ${visible.length}`)

const sample = ['hsaka','ricmoo','jesse-pollak','tetranode','machibigbrother','0xmaki','sandeep-nailwal','arthur-hayes','punk4156','garyvee','do-kwon','nick-johnson','phil-daian']
console.log('\nSpot-check new traders:')
for (const s of sample) {
  const r = data.find(x => x.slug === s)
  if (!r) console.log(`  ${s.padEnd(22)} NOT IN TABLE`)
  else console.log(`  ${s.padEnd(22)} status=${r.submission_status} addrs=${(r.addresses||[]).length}`)
}

const notApproved = data.filter(r => r.submission_status !== 'approved' && Array.isArray(r.addresses) && r.addresses.length > 0)
if (notApproved.length) {
  console.log(`\n${notApproved.length} rows have addresses but status != approved (these are HIDDEN from /figures):`)
  for (const r of notApproved.slice(0,80)) console.log(`  ${r.slug.padEnd(28)} ${r.submission_status}`)
}
