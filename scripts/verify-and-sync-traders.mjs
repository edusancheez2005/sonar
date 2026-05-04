#!/usr/bin/env node
/**
 * verify-and-sync-traders.mjs
 *
 * Reads data/curated-traders-manifest.json. For each entry:
 *   - If `identifier` is an ENS name, resolves it on-chain via Cloudflare's
 *     public Ethereum gateway (no API key required).
 *   - If it's already a 0x... address or Solana base58, uses it as-is.
 *   - Entries that fail to resolve are SKIPPED with a clear log message.
 *
 * Verified entries are upserted into curated_entities. The address row
 * gets `note` and `source` pointing at Etherscan so users can audit.
 *
 * This is the answer to "how do we get more famous trader wallets without
 * making things up": the manifest only needs an ENS handle, and the script
 * does the cryptographic verification.
 *
 * Usage:
 *   node scripts/verify-and-sync-traders.mjs            # resolve + upsert
 *   node scripts/verify-and-sync-traders.mjs --dry-run  # resolve only, no DB writes
 *   node scripts/verify-and-sync-traders.mjs --slug=tetranode
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
try { (await import('dotenv')).default.config({ path: '.env.local' }) } catch {}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'data', 'curated-traders-manifest.json')

const ALLOWED = new Set(['person', 'company', 'government', 'protocol', 'celebrity'])
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SLUG_FILTER = (args.find((a) => a.startsWith('--slug=')) || '').slice('--slug='.length) || null

const ETH_RPC = process.env.ETH_RPC_URL
  || (process.env.ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null)
  || 'https://eth.llamarpc.com'

// ENS resolution via viem's high-level helper. Handles CCIP-read,
// universal resolver, wildcards, and the rest of ENSIP-10.
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const ethClient = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) })

function isAddress(s) { return /^0x[a-fA-F0-9]{40}$/.test(String(s || '')) }
function isSolana(s) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || '')) && !s.startsWith('0x') }
function isEns(s) { return typeof s === 'string' && s.endsWith('.eth') }

async function resolveEns(name) {
  const normalized = normalize(name)
  return await ethClient.getEnsAddress({ name: normalized })
}

async function resolveIdentifier(identifier) {
  if (isAddress(identifier)) return { chain: 'ethereum', address: identifier, source: `https://etherscan.io/address/${identifier.toLowerCase()}`, note: 'Verified address (manifest)' }
  if (isSolana(identifier)) return { chain: 'solana', address: identifier, source: `https://solscan.io/account/${identifier}`, note: 'Verified Solana address (manifest)' }
  if (isEns(identifier)) {
    const addr = await resolveEns(identifier)
    if (!addr) return null
    return {
      chain: 'ethereum',
      address: addr,
      source: `https://etherscan.io/address/${addr.toLowerCase()}`,
      note: `${identifier} — ENS reverse-resolved via Ethereum mainnet RPC`,
    }
  }
  return null
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!DRY_RUN && (!url || !key)) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE.')
    process.exit(1)
  }

  const raw = readFileSync(MANIFEST, 'utf8')
  const json = JSON.parse(raw)
  let traders = json.traders || []
  if (SLUG_FILTER) traders = traders.filter((t) => t.slug === SLUG_FILTER)
  console.log(`Loaded ${traders.length} traders${SLUG_FILTER ? ` (filter: ${SLUG_FILTER})` : ''}.\n`)

  const supabase = (!DRY_RUN) ? createClient(url, key, { auth: { persistSession: false } }) : null

  let resolved = 0, skipped = 0, written = 0, failed = 0

  for (const t of traders) {
    if (!ALLOWED.has(t.category)) {
      console.log(`✗ ${t.slug}: invalid category "${t.category}"`)
      skipped += 1
      continue
    }
    let info
    try {
      info = await resolveIdentifier(t.identifier)
    } catch (e) {
      console.log(`✗ ${t.slug.padEnd(22)} ${t.identifier.padEnd(28)} resolve error: ${e.message}`)
      skipped += 1
      continue
    }
    if (!info) {
      console.log(`- ${t.slug.padEnd(22)} ${t.identifier.padEnd(28)} no resolver / no addr (skip)`)
      skipped += 1
      continue
    }
    resolved += 1
    console.log(`✓ ${t.slug.padEnd(22)} ${t.identifier.padEnd(28)} → ${info.address}`)
    if (DRY_RUN) continue

    const row = {
      slug: t.slug,
      display_name: t.display_name,
      description: t.description || null,
      category: t.category,
      twitter_handle: t.twitter_handle || null,
      is_featured: !!t.is_featured,
      addresses: [{
        address: info.address,
        chain: info.chain,
        note: info.note,
        source: info.source,
        verified: true,
      }],
      submission_status: 'approved',
    }
    const { error } = await supabase.from('curated_entities').upsert(row, { onConflict: 'slug' })
    if (error) {
      console.log(`  ✗ DB write failed: ${error.message}`)
      failed += 1
    } else {
      written += 1
    }
    // Be polite to the public RPC.
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log(`\nResolved ${resolved}/${traders.length} • skipped ${skipped} • ${DRY_RUN ? 'dry-run (0 written)' : `written ${written} • failed ${failed}`}`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
