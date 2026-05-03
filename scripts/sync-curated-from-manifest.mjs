#!/usr/bin/env node
/**
 * sync-curated-from-manifest.mjs
 *
 * Reads data/curated-entities-manifest.json and upserts every entity into
 * the curated_entities Supabase table. This is the SCALE answer: instead of
 * writing seed_famous_wallets_vN.sql by hand each time you want to add a
 * figure, edit the JSON and run this script.
 *
 * Usage:
 *   # Required env: SUPABASE_URL + SUPABASE_SERVICE_ROLE
 *   node scripts/sync-curated-from-manifest.mjs
 *
 *   # Dry run (no writes, just print what would change):
 *   node scripts/sync-curated-from-manifest.mjs --dry-run
 *
 *   # Limit to one slug:
 *   node scripts/sync-curated-from-manifest.mjs --slug=arbitrum-bridge
 *
 * Idempotency: ON CONFLICT (slug) DO UPDATE. addresses=[] never overwrites
 * a populated row (lets you stub out new slugs without losing prior data).
 *
 * Verification: after a successful sync, prints the address count per slug
 * so you can confirm Supabase has what you expect.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
// Also try .env.local (Next.js convention) since most secrets live there.
try { (await import('dotenv')).default.config({ path: '.env.local' }) } catch {}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'data', 'curated-entities-manifest.json')

const ALLOWED_CATEGORIES = new Set(['person', 'company', 'government', 'protocol', 'celebrity'])

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SLUG_FILTER = (args.find((a) => a.startsWith('--slug=')) || '').slice('--slug='.length) || null

function loadManifest() {
  const raw = readFileSync(MANIFEST_PATH, 'utf8')
  const json = JSON.parse(raw)
  if (!Array.isArray(json.entities)) throw new Error('manifest.entities must be an array')
  return json.entities
}

function validateEntity(e) {
  const errors = []
  if (!e.slug || typeof e.slug !== 'string') errors.push('missing slug')
  if (!e.display_name) errors.push('missing display_name')
  if (!ALLOWED_CATEGORIES.has(e.category)) errors.push(`invalid category "${e.category}" (allowed: ${[...ALLOWED_CATEGORIES].join('|')})`)
  if (!Array.isArray(e.addresses)) errors.push('addresses must be an array')
  for (const a of e.addresses || []) {
    if (!a.address) errors.push(`address row missing 'address' field`)
    if (!a.chain) errors.push(`address ${a.address} missing 'chain'`)
    if (!a.source) errors.push(`address ${a.address} missing verifiable 'source' URL`)
  }
  return errors
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars.')
    process.exit(1)
  }

  const entities = loadManifest()
  const filtered = SLUG_FILTER ? entities.filter((e) => e.slug === SLUG_FILTER) : entities
  if (SLUG_FILTER && filtered.length === 0) {
    console.error(`No entity with slug "${SLUG_FILTER}" in manifest.`)
    process.exit(1)
  }

  console.log(`Loaded ${entities.length} entities${SLUG_FILTER ? ` (filter: ${SLUG_FILTER})` : ''}.`)

  // Validate everything before touching the DB.
  let totalErrors = 0
  for (const e of filtered) {
    const errs = validateEntity(e)
    if (errs.length) {
      console.error(`✗ ${e.slug || '(no slug)'}: ${errs.join('; ')}`)
      totalErrors += errs.length
    }
  }
  if (totalErrors > 0) {
    console.error(`Aborting: ${totalErrors} validation error(s).`)
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN ---')
    for (const e of filtered) {
      console.log(`would upsert ${e.slug.padEnd(26)} category=${e.category.padEnd(10)} addrs=${e.addresses.length}`)
    }
    return
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Read existing rows so we can preserve addresses when manifest sends [].
  const { data: existing, error: readErr } = await supabase
    .from('curated_entities')
    .select('slug, addresses')
    .in('slug', filtered.map((e) => e.slug))
  if (readErr) {
    console.error('Failed to read existing rows:', readErr.message)
    process.exit(1)
  }
  const existingBySlug = new Map((existing || []).map((r) => [r.slug, r.addresses || []]))

  let okCount = 0
  let failCount = 0
  for (const e of filtered) {
    const incoming = e.addresses || []
    const prior = existingBySlug.get(e.slug) || []
    // Never let an empty manifest entry wipe out previously-seeded addresses.
    const finalAddresses = incoming.length === 0 && prior.length > 0 ? prior : incoming

    const row = {
      slug: e.slug,
      display_name: e.display_name,
      description: e.description || null,
      category: e.category,
      twitter_handle: e.twitter_handle || null,
      is_featured: !!e.is_featured,
      addresses: finalAddresses,
      submission_status: 'approved',
    }

    const { error: upErr } = await supabase
      .from('curated_entities')
      .upsert(row, { onConflict: 'slug' })

    if (upErr) {
      console.error(`✗ ${e.slug}: ${upErr.message}`)
      failCount += 1
    } else {
      console.log(`✓ ${e.slug.padEnd(26)} addrs=${finalAddresses.length}${incoming.length === 0 && prior.length > 0 ? ' (preserved prior)' : ''}`)
      okCount += 1
    }
  }

  console.log(`\nDone. ${okCount} ok, ${failCount} failed.`)
  if (failCount > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
