#!/usr/bin/env node
/**
 * Auto-fetch profile pictures for every figure in `curated_entities`
 * and persist them under `public/figures/{slug}.{ext}`.
 *
 * Resolution order per figure (stops at first success):
 *   1. ENS avatar — https://metadata.ens.domains/mainnet/avatar/<name>.eth
 *      - Used when the slug is in the explicit ENS map OR any address
 *        note on the row contains a `.eth` hint.
 *   2. Wikipedia thumbnail — page summary → `originalimage` (hi-res)
 *      falling back to `thumbnail`.
 *
 * Usage:
 *   node scripts/fetch_figure_avatars.js          # skip figures w/ avatar already on disk
 *   node scripts/fetch_figure_avatars.js --force  # re-download all
 *
 * Only requires @supabase/supabase-js (already installed) plus Node
 * built-ins (fs, path, global fetch). No new dependencies.
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
    // Strip surrounding quotes if present.
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

const FORCE = process.argv.includes('--force')
const OUT_DIR = path.resolve(process.cwd(), 'public', 'figures')
const USER_AGENT = 'SonarAvatarFetcher/1.0 (sonartracker.io)'
const FETCH_TIMEOUT_MS = 15000

// Known ENS primary names for curated figures. Extend as new figures are
// seeded with a provable ENS identity (no guessing — each entry should
// resolve to an address the figure publicly controls).
const ENS_NAMES = {
  'vitalik-buterin': 'vitalik.eth',
  'hayden-adams': 'haydenadams.eth',
  'balaji-srinivasan': 'balajis.eth',
  cobie: 'cobie.eth',
}

// Slug → Wikipedia page title (underscore-joined, URL-safe as-is).
// Entries not listed here simply skip the Wikipedia step — e.g. Cobie
// has no standalone Wikipedia page.
const WIKIPEDIA_TITLES = {
  'vitalik-buterin': 'Vitalik_Buterin',
  'donald-trump': 'Donald_Trump',
  'michael-saylor': 'Michael_J._Saylor',
  'elon-musk': 'Elon_Musk',
  'justin-sun': 'Justin_Sun',
  'balaji-srinivasan': 'Balaji_Srinivasan',
  'hayden-adams': 'Hayden_Adams_(businessman)',
  'arthur-hayes': 'Arthur_Hayes_(cryptocurrency_entrepreneur)',
  sbf: 'Sam_Bankman-Fried',
  microstrategy: 'Strategy_(company)',
  tesla: 'Tesla,_Inc.',
  'jump-trading': 'Jump_Trading',
  paradigm: 'Paradigm_(investment_firm)',
  'el-salvador': 'El_Salvador',
}

// Content-Type → filename extension. Falls back to .jpg when a server
// lies or returns a generic type; the browser will still render the
// bytes correctly because it sniffs its own MIME.
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

// ─── Fetch helpers ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function rawFetch(url, init, timeoutMs) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: ctl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: init?.headers?.Accept || '*/*',
        ...(init.headers || {}),
      },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(t)
  }
}

// Retry on 429 / 503 with exponential backoff. Wikipedia's upload
// CDN (upload.wikimedia.org) throttles unauthenticated bursts, so we
// respect the Retry-After header when present. Capped at 20s per
// wait so a pathological response can't hang the script forever.
async function fetchWithTimeout(url, init = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const maxAttempts = 4
  let lastRes = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastRes = await rawFetch(url, init, timeoutMs)
    if (lastRes.status !== 429 && lastRes.status !== 503) return lastRes
    if (attempt === maxAttempts) return lastRes
    const retryAfterHeader = Number(lastRes.headers.get('retry-after'))
    const backoff = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : 1000 * Math.pow(2, attempt - 1)
    await sleep(Math.min(backoff, 20000))
  }
  return lastRes
}

function extFromResponse(res) {
  const ct = String(res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim()
  return EXT_BY_MIME[ct] || 'jpg'
}

async function readImageBuffer(res) {
  const ct = String(res.headers.get('content-type') || '').toLowerCase()
  if (!ct.startsWith('image/')) {
    throw new Error(`not an image (content-type=${ct || 'missing'})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  if (arrayBuffer.byteLength === 0) throw new Error('empty body')
  return Buffer.from(arrayBuffer)
}

// ─── Source strategies ───────────────────────────────────────────────────
async function tryEns(ensName) {
  const url = `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(ensName)}`
  const res = await fetchWithTimeout(url, { headers: { Accept: 'image/*' } })
  if (!res.ok) throw new Error(`ENS avatar ${res.status}`)
  const buf = await readImageBuffer(res)
  return { buffer: buf, ext: extFromResponse(res), source: `ENS (${ensName})` }
}

async function tryWikipedia(title) {
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
  const summary = await fetchWithTimeout(summaryUrl, {
    headers: { Accept: 'application/json' },
  })
  if (!summary.ok) throw new Error(`Wikipedia summary ${summary.status}`)
  const json = await summary.json()
  // Prefer the higher-resolution `originalimage` when available; fall
  // back to the square `thumbnail` Wikipedia auto-generates.
  const imageUrl = json?.originalimage?.source || json?.thumbnail?.source || null
  if (!imageUrl) throw new Error('Wikipedia summary has no image')
  const img = await fetchWithTimeout(imageUrl, { headers: { Accept: 'image/*' } })
  if (!img.ok) throw new Error(`Wikipedia image ${img.status}`)
  const buf = await readImageBuffer(img)
  return { buffer: buf, ext: extFromResponse(img), source: 'Wikipedia' }
}

// ─── Figure → ENS candidate resolution ───────────────────────────────────
function ensCandidateFor(figure) {
  const slug = figure.slug
  if (ENS_NAMES[slug]) return ENS_NAMES[slug]
  // Scan address notes for a `.eth` hint. Addresses is jsonb; Supabase
  // returns it as a JS array/object.
  const addrs = Array.isArray(figure.addresses) ? figure.addresses : []
  for (const a of addrs) {
    const note = String(a?.note || '').trim()
    const match = note.match(/\b([a-z0-9-]+\.eth)\b/i)
    if (match) return match[1].toLowerCase()
  }
  return null
}

// ─── Skip logic ──────────────────────────────────────────────────────────
function hasValidLocalAvatar(figure) {
  const url = String(figure.avatar_url || '')
  if (!url.startsWith('/figures/')) return false
  const rel = url.replace(/^\//, '') // e.g. "figures/vitalik-buterin.jpg"
  const abs = path.resolve(process.cwd(), 'public', rel)
  try {
    const stat = fs.statSync(abs)
    return stat.isFile() && stat.size > 0
  } catch {
    return false
  }
}

// ─── Persist + DB update ─────────────────────────────────────────────────
function writeAvatarFile(slug, buffer, ext) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  // When re-downloading we may pick a different extension. Clean up
  // stale siblings so the directory doesn't accumulate orphans.
  for (const e of Object.values(EXT_BY_MIME)) {
    const stale = path.join(OUT_DIR, `${slug}.${e}`)
    if (e !== ext && fs.existsSync(stale)) {
      try { fs.unlinkSync(stale) } catch { /* noop */ }
    }
  }
  const out = path.join(OUT_DIR, `${slug}.${ext}`)
  fs.writeFileSync(out, buffer)
  return `/figures/${slug}.${ext}`
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  const { data: figures, error } = await supabase
    .from('curated_entities')
    .select('slug, display_name, avatar_url, addresses')
    .order('slug', { ascending: true })

  if (error) {
    console.error('Failed to list curated_entities:', error.message)
    process.exit(1)
  }
  if (!figures || figures.length === 0) {
    console.warn('No figures found in curated_entities — nothing to do.')
    return
  }

  console.log(`Found ${figures.length} figure(s). Force=${FORCE ? 'yes' : 'no'}`)
  console.log('')

  const results = []
  let downloadIndex = 0

  for (const f of figures) {
    const slug = f.slug
    if (!FORCE && hasValidLocalAvatar(f)) {
      console.log(`↷ skipping ${slug}, already has avatar`)
      results.push({ slug, status: 'skipped', source: 'existing' })
      continue
    }
    // Small politeness gap between network-bound figures so we don't
    // burst the Wikipedia / ENS endpoints.
    if (downloadIndex > 0) await sleep(350)
    downloadIndex += 1

    let resolved = null
    const attempts = []

    // 1) ENS
    const ensName = ensCandidateFor(f)
    if (ensName) {
      try {
        resolved = await tryEns(ensName)
      } catch (e) {
        attempts.push(`ENS(${ensName}): ${e.message}`)
      }
    }

    // 2) Wikipedia
    if (!resolved) {
      const title = WIKIPEDIA_TITLES[slug]
      if (title) {
        try {
          resolved = await tryWikipedia(title)
        } catch (e) {
          attempts.push(`Wikipedia(${title}): ${e.message}`)
        }
      } else {
        attempts.push('Wikipedia: no title mapping')
      }
    }

    if (!resolved) {
      console.warn(`✗ ${slug} — no source (${attempts.join('; ') || 'no attempts'})`)
      results.push({ slug, status: 'failed', source: null })
      continue
    }

    try {
      const publicPath = writeAvatarFile(slug, resolved.buffer, resolved.ext)
      const { error: upErr } = await supabase
        .from('curated_entities')
        .update({ avatar_url: publicPath })
        .eq('slug', slug)
      if (upErr) throw new Error(`DB update failed: ${upErr.message}`)
      console.log(`✓ ${slug} (${resolved.source}) → ${publicPath}`)
      results.push({ slug, status: 'ok', source: resolved.source })
    } catch (e) {
      console.warn(`✗ ${slug} — ${e.message}`)
      results.push({ slug, status: 'failed', source: null })
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  const okCount = results.filter((r) => r.status === 'ok').length
  const skipCount = results.filter((r) => r.status === 'skipped').length
  const failCount = results.filter((r) => r.status === 'failed').length

  console.log('\n─── Summary ───')
  for (const r of results) {
    if (r.status === 'ok') console.log(`✓ ${r.slug} (${r.source})`)
    else if (r.status === 'skipped') console.log(`↷ ${r.slug} (skipped, already has avatar)`)
    else console.log(`✗ ${r.slug} (no source)`)
  }
  console.log('')
  console.log(
    `Updated ${okCount}/${figures.length} figures` +
      (skipCount ? `, skipped ${skipCount}` : '') +
      (failCount ? `, failed ${failCount}` : '') +
      '.'
  )
}

main().catch((e) => {
  console.error('Fatal:', e?.stack || e?.message || e)
  process.exit(1)
})
