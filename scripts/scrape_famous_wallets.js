#!/usr/bin/env node
/**
 * Populate `curated_entities` from public sources.
 *
 * Sources (tried independently, failures in one do not stop the rest):
 *   A) DefiLlama /protocols — protocols with a `twitter` handle and
 *      at least one resolvable treasury wallet.
 *   B) Etherscan label cloud — best-effort scrape of labelcloud +
 *      per-label address tables. Etherscan serves these behind heavy
 *      anti-bot; when the scrape returns 0 rows we just move on.
 *   C) Hardcoded high-signal seed list — ~30 VCs, founders, and BTC
 *      ETF issuers we want in the directory even when no public
 *      on-chain address is available.
 *
 * All scraped candidates go through a single dedupe step against the
 * existing `curated_entities.slug` set, so manually-curated rows are
 * never overwritten.
 *
 * Usage:
 *   node scripts/scrape_famous_wallets.js --dry-run
 *   node scripts/scrape_famous_wallets.js
 *   node scripts/scrape_famous_wallets.js --source=defillama
 *   node scripts/scrape_famous_wallets.js --source=etherscan
 *   node scripts/scrape_famous_wallets.js --source=hardcoded
 *   node scripts/scrape_famous_wallets.js --limit=200
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// ─── .env.local loader (no dotenv dep) ───────────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

// ─── CLI flags ───────────────────────────────────────────────────────────
function argFlag(name) {
  return process.argv.some((a) => a === `--${name}`)
}
function argValue(name, fallback = null) {
  for (const a of process.argv) {
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3)
  }
  return fallback
}

const DRY_RUN = argFlag('dry-run')
const SOURCE_FILTER = argValue('source') // 'defillama' | 'etherscan' | 'hardcoded' | null
const LIMIT = Number(argValue('limit', '9999')) || 9999
const USER_AGENT = 'Sonar/1.0 (sonartracker.io)'
const REQUEST_TIMEOUT_MS = 10000
const PER_SOURCE_GAP_MS = 1000 // polite 1 req/sec per source

// ─── Config ──────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'SUPABASE_SERVICE_ROLE (or SUPABASE_SERVICE_ROLE_KEY) in .env.local.'
  )
  process.exit(1)
}

// DB check constraint allows only these five categories. The spec
// mentioned `exchange` as a taxonomy value — we collapse it to
// `company` (all CEXes are companies) so the INSERT doesn't fail.
const VALID_CATEGORIES = new Set(['person', 'company', 'government', 'protocol', 'celebrity'])

// ─── Helpers ─────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(url, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: init?.headers?.Accept || '*/*',
        ...(init.headers || {}),
      },
    })
  } finally {
    clearTimeout(t)
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function clampDescription(s) {
  const t = String(s || '').trim()
  if (!t) return null
  if (t.length <= 140) return t
  return t.slice(0, 137).trimEnd() + '…'
}

function stripAt(handle) {
  if (!handle) return null
  const t = String(handle).trim().replace(/^@+/, '')
  if (!t) return null
  // Sometimes people store the full URL in the `twitter` field.
  const m = t.match(/(?:twitter|x)\.com\/([^\/\?\#]+)/i)
  if (m) return m[1]
  if (/^[A-Za-z0-9_]{1,15}$/.test(t)) return t
  return null
}

function normalizeChain(chain) {
  const c = String(chain || '').toLowerCase().trim()
  const map = {
    ethereum: 'ethereum',
    eth: 'ethereum',
    polygon: 'polygon',
    matic: 'polygon',
    'polygon-pos': 'polygon',
    arbitrum: 'arbitrum',
    arb: 'arbitrum',
    'arbitrum-one': 'arbitrum',
    base: 'base',
    bitcoin: 'bitcoin',
    btc: 'bitcoin',
    solana: 'solana',
    sol: 'solana',
    xrp: 'xrp',
    xrpl: 'xrp',
    ripple: 'xrp',
  }
  return map[c] || c || 'ethereum'
}

function normalizeCategory(cat) {
  const c = String(cat || '').toLowerCase().trim()
  if (c === 'exchange' || c === 'cex' || c === 'dex') return 'company'
  if (VALID_CATEGORIES.has(c)) return c
  return 'company'
}

// ─── Candidate assembly ──────────────────────────────────────────────────
// All sources emit candidates in the same shape so the dedupe / insert
// pipeline stays uniform:
//   { slug, display_name, description, category, twitter_handle,
//     addresses: [{address,chain,note}], source }

function isValidCandidate(c) {
  if (!c || !c.slug || !c.display_name) return false
  if (!VALID_CATEGORIES.has(c.category)) return false
  return true
}

// ─── Source A: DefiLlama ─────────────────────────────────────────────────
// Field reality (verified Apr 2026):
//   • `treasury` is an adapter filename ("lido.js") — not an address.
//     Kept as a just-in-case parser below in case a future adapter emits
//     actual addresses, but the real signal is the `address` field.
//   • `address` is the protocol's primary contract (usually the token
//     or governance contract on its home chain). 3.8k rows have both a
//     `twitter` handle and an `address`. We use this as our fallback
//     and tag it `Protocol contract` in the note.
//   • `chain` can be "Multi-Chain"; when the address is 0x-prefixed we
//     treat it as the Ethereum deployment.
async function scrapeDefiLlama() {
  const out = []
  let protocols = []
  try {
    const res = await fetchWithTimeout('https://api.llama.fi/protocols', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`)
    const json = await res.json()
    protocols = Array.isArray(json) ? json : []
  } catch (e) {
    console.warn(`  ⚠ DefiLlama fetch failed: ${e.message}`)
    return out
  }

  // Diagnostic summary — first-glance view of what the API looks like
  // today. Cheap to print and immediately exposes schema drift.
  const diag = {
    total: protocols.length,
    withTwitter: 0,
    withTreasuryField: 0,
    withTreasuryAddresses: 0, // usable address strings extracted from treasury
    withAddress: 0,
    withAnyUsableAddress: 0,
  }
  const sampleRows = []

  for (const p of protocols) {
    if (sampleRows.length < 3) {
      sampleRows.push({
        name: p?.name,
        slug: p?.slug,
        twitter: p?.twitter,
        chain: p?.chain,
        address: p?.address,
        treasury: p?.treasury,
      })
    }

    const twitter = stripAt(p?.twitter)
    if (twitter) diag.withTwitter += 1
    if (p?.treasury != null) diag.withTreasuryField += 1

    // Treasury parser — in practice the field is a filename so this
    // extracts 0, but we keep it defensively for adapters that might
    // one day return real addresses.
    const treasuryAddrs = []
    const t = p?.treasury
    if (Array.isArray(t)) {
      for (const entry of t) {
        if (typeof entry === 'string' && /^0x[a-f0-9]{40}$/i.test(entry)) {
          treasuryAddrs.push({ address: entry, chain: 'ethereum', note: 'DeFiLlama treasury' })
        } else if (entry && typeof entry === 'object' && entry.address) {
          treasuryAddrs.push({
            address: String(entry.address),
            chain: normalizeChain(entry.chain),
            note: 'DeFiLlama treasury',
          })
        }
      }
    } else if (t && typeof t === 'object') {
      for (const [chain, list] of Object.entries(t)) {
        if (!Array.isArray(list)) continue
        for (const addr of list) {
          if (typeof addr === 'string' && /^0x[a-f0-9]{40}$/i.test(addr)) {
            treasuryAddrs.push({
              address: addr,
              chain: normalizeChain(chain),
              note: 'DeFiLlama treasury',
            })
          }
        }
      }
    }
    if (treasuryAddrs.length > 0) diag.withTreasuryAddresses += 1

    // Primary fallback: the protocol's `address` field.
    const primaryAddr = typeof p?.address === 'string' ? p.address.trim() : ''
    const hasPrimary = /^0x[a-f0-9]{40}$/i.test(primaryAddr)
    if (hasPrimary) diag.withAddress += 1

    // Prefer treasury data when it's real; otherwise fall back to the
    // primary protocol contract. Skip rows that have neither.
    let addresses
    if (treasuryAddrs.length > 0) {
      addresses = treasuryAddrs
    } else if (hasPrimary) {
      // Multi-Chain / unknown chain defaults to Ethereum for 0x-
      // prefixed contracts, which is what DefiLlama uses in practice.
      const rawChain = String(p?.chain || '').toLowerCase()
      const chain =
        rawChain && rawChain !== 'multi-chain'
          ? normalizeChain(rawChain)
          : 'ethereum'
      addresses = [{ address: primaryAddr, chain, note: 'Protocol contract' }]
    } else {
      continue
    }

    if (twitter && addresses.length > 0) diag.withAnyUsableAddress += 1

    if (!twitter) continue
    const name = String(p.name || '').trim()
    if (!name) continue

    // Most DefiLlama rows are protocols. Flag known CeFi names as
    // `company` instead.
    const raw = String(p.category || '').toLowerCase()
    const category =
      raw.includes('cex') ||
      raw.includes('exchange') ||
      /coinbase|kraken|binance|bitfinex|gemini/i.test(name)
        ? 'company'
        : 'protocol'

    out.push({
      slug: slugify(name),
      display_name: name,
      description: clampDescription(p.description),
      category: normalizeCategory(category),
      twitter_handle: twitter,
      addresses,
      source: 'DeFiLlama',
    })
  }

  console.log(
    `  diag: total=${diag.total}, twitter=${diag.withTwitter}, ` +
      `treasury-field=${diag.withTreasuryField}, treasury-addrs=${diag.withTreasuryAddresses}, ` +
      `address-field=${diag.withAddress}, usable=${diag.withAnyUsableAddress}`
  )
  if (sampleRows.length) {
    console.log('  sample rows:')
    for (const s of sampleRows) {
      const treasurySnippet =
        s.treasury == null
          ? 'null'
          : typeof s.treasury === 'string'
            ? JSON.stringify(s.treasury)
            : JSON.stringify(s.treasury).slice(0, 80)
      console.log(
        `    - ${s.name} [chain=${s.chain}] twitter=${s.twitter || '-'} address=${s.address || '-'} treasury=${treasurySnippet}`
      )
    }
  }

  return out
}

// ─── Source B: Etherscan label cloud ─────────────────────────────────────
async function scrapeEtherscan(maxLabels = 100) {
  const out = []
  let labelHtml
  try {
    const res = await fetchWithTimeout('https://etherscan.io/labelcloud', {
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) throw new Error(`labelcloud ${res.status}`)
    labelHtml = await res.text()
  } catch (e) {
    console.warn(`  ⚠ Etherscan labelcloud fetch failed: ${e.message}`)
    return out
  }

  // Extract /accounts/label/<slug> links. Etherscan renders labels as
  // accordion headers pointing to a listing page per label. We keep
  // the raw slug (last URL segment) and a readable display name.
  const linkRegex = /href=["']\/accounts\/label\/([^"'#?]+)["'][^>]*>([^<]+)</gi
  const seen = new Set()
  const labels = []
  let match
  while ((match = linkRegex.exec(labelHtml)) !== null) {
    const rawSlug = match[1]
    const display = String(match[2] || '').trim()
    if (!rawSlug || !display) continue
    if (seen.has(rawSlug)) continue
    seen.add(rawSlug)
    labels.push({ rawSlug, display })
    if (labels.length >= maxLabels) break
  }

  if (labels.length === 0) {
    console.warn('  ⚠ Etherscan labelcloud returned 0 labels (likely rate-limited)')
    return out
  }

  // Only keep labels that look like entities we'd want to track.
  // Etherscan has thousands of labels (token contracts, phishing
  // tags, etc.) so we filter aggressively.
  const ENTITY_HINTS = [
    'exchange', 'cex', 'otc', 'wallet', 'capital', 'ventures',
    'foundation', 'labs', 'market maker', 'fund', 'trust', 'bank',
    'institutional', 'treasury',
  ]
  const filtered = labels.filter((l) => {
    const d = l.display.toLowerCase()
    return ENTITY_HINTS.some((h) => d.includes(h))
  })

  for (const label of filtered.slice(0, maxLabels)) {
    await sleep(PER_SOURCE_GAP_MS)
    let listingHtml
    try {
      const res = await fetchWithTimeout(
        `https://etherscan.io/accounts/label/${encodeURIComponent(label.rawSlug)}`,
        { headers: { Accept: 'text/html' } }
      )
      if (!res.ok) continue
      listingHtml = await res.text()
    } catch {
      continue
    }

    // Pull every 0x-prefixed address in the response. The listing
    // page renders them inside an `<a href="/address/0x…">` anchor,
    // so we scope the regex to those anchors to avoid sampling
    // unrelated addresses that live elsewhere in the layout.
    const addrRegex = /href=["']\/address\/(0x[a-fA-F0-9]{40})["']/g
    const addrs = new Set()
    let m2
    while ((m2 = addrRegex.exec(listingHtml)) !== null) {
      addrs.add(m2[1])
      if (addrs.size >= 25) break
    }
    if (addrs.size === 0) continue

    const addresses = [...addrs].map((a) => ({
      address: a,
      chain: 'ethereum',
      note: 'Etherscan label',
    }))

    out.push({
      slug: slugify(label.display),
      display_name: label.display,
      description: clampDescription(`Tracked from Etherscan label "${label.display}".`),
      category: 'company',
      twitter_handle: null,
      addresses,
      source: 'Etherscan',
    })
  }
  return out
}

// ─── Source C: Hardcoded high-signal seed list ───────────────────────────
// ~30 entries. Address lists are intentionally empty for entities whose
// operational wallets are not publicly identified; they still appear in
// the directory with a "No verified addresses yet" state per the /figures
// card copy. `twitter_handle` is best-effort and can be null when a
// verified account is ambiguous.
const HARDCODED_SEEDS = [
  // ── VCs ───────────────────────────────────────────────────────────────
  { slug: 'a16z-crypto', display_name: 'a16z crypto', description: 'Andreessen Horowitz crypto fund', category: 'company', twitter_handle: 'a16zcrypto' },
  { slug: 'sequoia-capital', display_name: 'Sequoia Capital', description: 'Silicon Valley VC with a crypto arm', category: 'company', twitter_handle: 'sequoia' },
  { slug: 'pantera-capital', display_name: 'Pantera Capital', description: 'Dedicated crypto investment firm', category: 'company', twitter_handle: 'PanteraCapital' },
  { slug: 'union-square-ventures', display_name: 'Union Square Ventures', description: 'NYC VC, early Coinbase backer', category: 'company', twitter_handle: 'usv' },
  { slug: 'multicoin-capital', display_name: 'Multicoin Capital', description: 'Thesis-driven crypto fund', category: 'company', twitter_handle: 'multicoincap' },
  { slug: 'polychain-capital', display_name: 'Polychain Capital', description: 'Crypto hedge fund founded by Olaf Carlson-Wee', category: 'company', twitter_handle: 'polychaincap' },
  { slug: 'dragonfly', display_name: 'Dragonfly', description: 'Global crypto-native fund', category: 'company', twitter_handle: 'dragonfly_xyz' },
  { slug: 'variant-fund', display_name: 'Variant', description: 'Early-stage crypto investment firm', category: 'company', twitter_handle: 'variantfund' },
  { slug: 'electric-capital', display_name: 'Electric Capital', description: 'Crypto VC, authors of the Developer Report', category: 'company', twitter_handle: 'ElectricCapital' },
  { slug: 'lightspeed-faction', display_name: 'Lightspeed Faction', description: 'Lightspeed Venture Partners crypto arm', category: 'company', twitter_handle: 'lightspeedvp' },

  // ── Founders ──────────────────────────────────────────────────────────
  { slug: 'brian-armstrong', display_name: 'Brian Armstrong', description: 'Co-founder and CEO of Coinbase', category: 'person', twitter_handle: 'brian_armstrong' },
  { slug: 'changpeng-zhao', display_name: 'Changpeng Zhao', description: 'Founder of Binance (CZ)', category: 'person', twitter_handle: 'cz_binance' },
  { slug: 'anatoly-yakovenko', display_name: 'Anatoly Yakovenko', description: 'Co-founder of Solana Labs', category: 'person', twitter_handle: 'aeyakovenko' },
  { slug: 'do-kwon', display_name: 'Do Kwon', description: 'Co-founder of Terraform Labs', category: 'person', twitter_handle: 'stablekwon' },
  { slug: 'charles-hoskinson', display_name: 'Charles Hoskinson', description: 'Founder of Cardano / IOHK', category: 'person', twitter_handle: 'IOHK_Charles' },
  { slug: 'gavin-wood', display_name: 'Gavin Wood', description: 'Co-founder of Ethereum, founder of Polkadot', category: 'person', twitter_handle: 'gavofyork' },
  { slug: 'sergey-nazarov', display_name: 'Sergey Nazarov', description: 'Co-founder of Chainlink', category: 'person', twitter_handle: 'SergeyNazarov' },
  { slug: 'stani-kulechov', display_name: 'Stani Kulechov', description: 'Founder of Aave and Lens Protocol', category: 'person', twitter_handle: 'StaniKulechov' },
  { slug: 'andre-cronje', display_name: 'Andre Cronje', description: 'Founder of Yearn Finance, Sonic/Fantom', category: 'person', twitter_handle: 'AndreCronjeTech' },
  { slug: 'joe-lubin', display_name: 'Joe Lubin', description: 'Co-founder of Ethereum, founder of ConsenSys', category: 'person', twitter_handle: 'ethereumJoseph' },

  // ── BTC ETF issuers + institutional custodians ────────────────────────
  { slug: 'blackrock-ibit', display_name: 'BlackRock iShares Bitcoin Trust', description: 'IBIT — spot Bitcoin ETF', category: 'company', twitter_handle: 'BlackRock' },
  { slug: 'fidelity-fbtc', display_name: 'Fidelity Wise Origin Bitcoin Fund', description: 'FBTC — spot Bitcoin ETF', category: 'company', twitter_handle: 'Fidelity' },
  { slug: 'ark-21shares', display_name: 'ARK 21Shares Bitcoin ETF', description: 'ARKB — spot Bitcoin ETF', category: 'company', twitter_handle: '21co' },
  { slug: 'bitwise-bitb', display_name: 'Bitwise Bitcoin ETF', description: 'BITB — spot Bitcoin ETF', category: 'company', twitter_handle: 'BitwiseInvest' },
  { slug: 'grayscale-gbtc', display_name: 'Grayscale Bitcoin Trust', description: 'GBTC — spot Bitcoin ETF', category: 'company', twitter_handle: 'Grayscale' },
  { slug: 'coinbase-custody', display_name: 'Coinbase Custody', description: 'Institutional qualified custodian', category: 'company', twitter_handle: 'coinbase' },
  { slug: 'galaxy-digital', display_name: 'Galaxy Digital', description: 'Crypto-native financial services firm', category: 'company', twitter_handle: 'GalaxyHQ' },
  { slug: 'valkyrie-brrr', display_name: 'Valkyrie Bitcoin Fund', description: 'BRRR — spot Bitcoin ETF (CoinShares acquired)', category: 'company', twitter_handle: 'valkyrieinvest' },
  { slug: 'franklin-ezbc', display_name: 'Franklin Bitcoin ETF', description: 'EZBC — spot Bitcoin ETF', category: 'company', twitter_handle: 'FTI_US' },
  { slug: 'vaneck-hodl', display_name: 'VanEck Bitcoin Trust', description: 'HODL — spot Bitcoin ETF', category: 'company', twitter_handle: 'vaneck_us' },
]

function collectHardcoded() {
  return HARDCODED_SEEDS.map((s) => ({
    slug: s.slug,
    display_name: s.display_name,
    description: clampDescription(s.description),
    category: normalizeCategory(s.category),
    twitter_handle: s.twitter_handle || null,
    addresses: [],
    source: 'Hardcoded',
  }))
}

// ─── Pipeline ────────────────────────────────────────────────────────────
function sourceEnabled(name) {
  if (!SOURCE_FILTER) return true
  return SOURCE_FILTER === name
}

async function collectAllCandidates() {
  const perSource = {}

  if (sourceEnabled('defillama')) {
    console.log('→ scraping DeFiLlama…')
    perSource.defillama = (await scrapeDefiLlama()).filter(isValidCandidate)
    console.log(`  found ${perSource.defillama.length} candidates`)
  }

  if (sourceEnabled('etherscan')) {
    console.log('→ scraping Etherscan labelcloud…')
    perSource.etherscan = (await scrapeEtherscan(100)).filter(isValidCandidate)
    console.log(`  found ${perSource.etherscan.length} candidates`)
  }

  if (sourceEnabled('hardcoded')) {
    console.log('→ reading hardcoded seeds…')
    perSource.hardcoded = collectHardcoded().filter(isValidCandidate)
    console.log(`  found ${perSource.hardcoded.length} candidates`)
  }

  // Merge with intra-run dedupe by slug. First source to claim a slug
  // wins (order: hardcoded > defillama > etherscan) since hardcoded
  // entries are hand-curated and higher trust.
  const mergeOrder = ['hardcoded', 'defillama', 'etherscan']
  const merged = new Map()
  for (const key of mergeOrder) {
    for (const cand of perSource[key] || []) {
      if (!merged.has(cand.slug)) merged.set(cand.slug, cand)
    }
  }

  return { merged: [...merged.values()], perSource }
}

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Sonar wallet scraper — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${SOURCE_FILTER ? ` [source=${SOURCE_FILTER}]` : ''}\n`)

  const { merged, perSource } = await collectAllCandidates()

  // Pull the set of existing slugs so we can skip anything already
  // present (protects manually-curated rows).
  const { data: existing, error: existErr } = await supabase
    .from('curated_entities')
    .select('slug')
  if (existErr) {
    console.error('Failed to fetch existing slugs:', existErr.message)
    process.exit(1)
  }
  const existingSlugs = new Set((existing || []).map((r) => r.slug))

  const newCandidates = merged
    .filter((c) => !existingSlugs.has(c.slug))
    .slice(0, LIMIT)

  // Per-source "new" counts for the summary output.
  const newBySource = { DeFiLlama: 0, Etherscan: 0, Hardcoded: 0 }
  for (const c of newCandidates) newBySource[c.source] = (newBySource[c.source] || 0) + 1

  console.log('')
  console.log(`📊 Scraped from DefiLlama: ${newBySource.DeFiLlama} new`)
  console.log(`📊 Scraped from Etherscan: ${newBySource.Etherscan} new`)
  console.log(`📊 Hardcoded seeds: ${newBySource.Hardcoded} new`)
  console.log('')

  if (newCandidates.length === 0) {
    console.log('No new entities to insert. Exiting.')
    return
  }

  const duplicatesCount =
    merged.length - newCandidates.length // slugs filtered because they already exist

  if (DRY_RUN) {
    console.log(`(dry-run) Would insert ${newCandidates.length} new figures (${duplicatesCount} already exist).`)
    console.log('')
    for (const c of newCandidates) {
      console.log(
        `  + ${c.slug.padEnd(30)} ${c.category.padEnd(10)} ${c.source.padEnd(10)} @${c.twitter_handle || '-'} (${c.addresses.length} addrs)`
      )
    }
    console.log('')
    console.log('Re-run without --dry-run to write to Supabase.')
    return
  }

  // Batch insert. `ignoreDuplicates` collapses to ON CONFLICT DO NOTHING
  // on the primary key, so even a racing write from another process
  // can't break us.
  const rows = newCandidates.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    description: c.description,
    category: c.category,
    twitter_handle: c.twitter_handle,
    addresses: c.addresses,
    is_featured: false,
  }))

  // Chunk the insert to stay under PostgREST payload limits for the
  // rare case where Etherscan dumps hundreds of addresses.
  const CHUNK = 100
  let written = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('curated_entities')
      .upsert(chunk, { onConflict: 'slug', ignoreDuplicates: true })
    if (error) {
      console.error(`  ✗ insert chunk [${i}..${i + chunk.length}] failed: ${error.message}`)
      continue
    }
    written += chunk.length
  }

  console.log(
    `✅ Inserted ${written} new figures (${duplicatesCount} deduped against existing)`
  )
  console.log('💡 Run: node scripts/fetch_figure_avatars.js to fetch their photos')
}

run().catch((e) => {
  console.error('Fatal:', e?.stack || e?.message || e)
  process.exit(1)
})
