#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * sync_entity_avatars.js
 *
 * Pulls profile pictures from the official X (Twitter) API for every
 * row in `curated_entities` that has a `twitter_handle` but no usable
 * `avatar_url`, then writes the result back to Supabase.
 *
 * Why X API instead of unavatar.io?
 *   unavatar caches aggressively and silently fails on suspended /
 *   protected / renamed accounts. The X API is authoritative.
 *
 * Usage:
 *   node scripts/sync_entity_avatars.js              # only blanks
 *   node scripts/sync_entity_avatars.js --refresh    # re-fetch all
 *   node scripts/sync_entity_avatars.js --slug brian-armstrong
 *
 * Env (.env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE
 *   X_BEARER_TOKEN
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE
const X_BEARER = process.env.X_BEARER_TOKEN

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env.local')
  process.exit(1)
}
if (!X_BEARER) {
  console.error('✗ Missing X_BEARER_TOKEN in .env.local')
  console.error('  Get one at https://developer.x.com/en/portal/dashboard')
  process.exit(1)
}

const args = process.argv.slice(2)
const REFRESH_ALL = args.includes('--refresh')
const SLUG_IDX = args.indexOf('--slug')
const ONLY_SLUG = SLUG_IDX >= 0 ? args[SLUG_IDX + 1] : null

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * X API allows fetching up to 100 users per request via
 * GET /2/users/by?usernames=a,b,c&user.fields=profile_image_url
 * Free tier is heavily rate-limited (a few requests per 15 min) so we
 * batch + sleep generously between calls.
 */
async function fetchProfileImages(handles) {
  const url = new URL('https://api.x.com/2/users/by')
  url.searchParams.set('usernames', handles.join(','))
  url.searchParams.set('user.fields', 'profile_image_url,verified,description')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${X_BEARER}` },
  })

  if (res.status === 429) {
    const reset = Number(res.headers.get('x-rate-limit-reset')) || 0
    const waitMs = Math.max(15_000, reset * 1000 - Date.now() + 5000)
    console.warn(`⚠ Rate limited. Sleeping ${Math.round(waitMs / 1000)}s…`)
    await sleep(waitMs)
    return fetchProfileImages(handles)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`X API ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = await res.json()
  const map = new Map()
  for (const u of json.data || []) {
    // X returns the `_normal` (48px) variant by default. Swap it for the
    // larger `_400x400` to get a sharp avatar in our 44–88px UI slots.
    const large = (u.profile_image_url || '').replace('_normal.', '_400x400.')
    if (large) {
      map.set(u.username.toLowerCase(), {
        avatar_url: large,
        bio: u.description || null,
        verified: !!u.verified,
      })
    }
  }
  // Capture not-found / suspended handles so we can mark them and skip
  // forever (avoids re-querying broken handles every run).
  const errors = new Map()
  for (const e of json.errors || []) {
    if (e.value) errors.set(String(e.value).toLowerCase(), e.detail || e.title)
  }
  return { map, errors }
}

async function loadTargets() {
  let q = sb
    .from('curated_entities')
    .select('id, slug, display_name, twitter_handle, avatar_url')
    .not('twitter_handle', 'is', null)

  if (ONLY_SLUG) q = q.eq('slug', ONLY_SLUG)
  else if (!REFRESH_ALL) q = q.is('avatar_url', null)

  const { data, error } = await q
  if (error) throw error
  return (data || []).filter((r) => r.twitter_handle && r.twitter_handle.trim())
}

async function writeAvatar(id, avatar_url) {
  const { error } = await sb
    .from('curated_entities')
    .update({ avatar_url })
    .eq('id', id)
  if (error) throw error
}

async function main() {
  console.log(`→ Loading entities${REFRESH_ALL ? ' (refresh all)' : ''}${ONLY_SLUG ? ` (slug=${ONLY_SLUG})` : ''}…`)
  const targets = await loadTargets()
  console.log(`→ ${targets.length} candidate(s) with twitter_handle`)
  if (targets.length === 0) return

  // Dedupe: many entities can share a handle (rare, but defensive)
  const byHandle = new Map()
  for (const t of targets) {
    const h = t.twitter_handle.replace(/^@/, '').trim().toLowerCase()
    if (!h) continue
    if (!byHandle.has(h)) byHandle.set(h, [])
    byHandle.get(h).push(t)
  }

  const handles = [...byHandle.keys()]
  const BATCH = 100 // X API max usernames per request
  let updated = 0
  let missing = 0

  for (let i = 0; i < handles.length; i += BATCH) {
    const slice = handles.slice(i, i + BATCH)
    console.log(`→ Fetching X profiles ${i + 1}–${i + slice.length} of ${handles.length}…`)
    const { map, errors } = await fetchProfileImages(slice)

    for (const h of slice) {
      const rows = byHandle.get(h) || []
      const hit = map.get(h)
      if (hit) {
        for (const r of rows) {
          await writeAvatar(r.id, hit.avatar_url)
          updated++
          console.log(`  ✓ ${r.slug.padEnd(28)} ← @${h}`)
        }
      } else {
        missing++
        const why = errors.get(h) || 'not found'
        for (const r of rows) {
          console.log(`  ✗ ${r.slug.padEnd(28)} @${h} (${why})`)
        }
      }
    }
    // Free tier is brutal — be a good citizen between batches
    if (i + BATCH < handles.length) await sleep(2000)
  }

  console.log(`\n✓ Done. updated=${updated} missing=${missing}`)
}

main().catch((e) => {
  console.error('✗ Fatal:', e.message || e)
  process.exit(1)
})
