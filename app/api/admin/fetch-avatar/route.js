import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isAdmin } from '@/app/lib/adminConfig'

export const dynamic = 'force-dynamic'

const USER_AGENT = 'SonarAvatarFetcher/1.0 (sonartracker.io)'
const FETCH_TIMEOUT_MS = 10000

async function requireAdmin(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { user: null, error: 'Unauthorized' }
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { user: null, error: 'Unauthorized' }
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return { user: null, error: 'Unauthorized' }
  if (!isAdmin(user.email)) return { user, error: 'Forbidden' }
  return { user, error: null }
}

async function headCheck(url) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS)
  try {
    // Many image CDNs reject HEAD, so fall back to a ranged GET that
    // only asks for the first byte — cheap, works universally.
    const res = await fetch(url, {
      method: 'GET',
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/*',
        Range: 'bytes=0-0',
      },
    })
    const ct = String(res.headers.get('content-type') || '').toLowerCase()
    return { ok: res.ok && ct.startsWith('image/'), status: res.status }
  } catch {
    return { ok: false, status: 0 }
  } finally {
    clearTimeout(t)
  }
}

// Pick an avatar URL worth pinning on the row. We don't download bytes
// to disk from the API route (Vercel's filesystem is read-only), so
// we resolve to a live, stable URL and persist it in `avatar_url`.
// Resolution order:
//   1) Any `.eth` name hinted in the address notes → ENS avatar endpoint
//   2) `unavatar.io/twitter/{handle}` if a twitter handle is present
// If neither succeeds we leave avatar_url untouched — the front-end
// already falls back to unavatar live via EntityAvatar.
async function resolveAvatarUrl({ addresses, twitter_handle }) {
  const addrs = Array.isArray(addresses) ? addresses : []
  for (const a of addrs) {
    const note = String(a?.note || '').trim()
    const m = note.match(/\b([a-z0-9-]+\.eth)\b/i)
    if (!m) continue
    const name = m[1].toLowerCase()
    const url = `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
    const { ok } = await headCheck(url)
    if (ok) return { url, source: `ENS (${name})` }
  }
  const handle = String(twitter_handle || '').trim().replace(/^@+/, '')
  if (handle && /^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    const url = `https://unavatar.io/twitter/${encodeURIComponent(handle)}?fallback=false`
    const { ok } = await headCheck(url)
    if (ok) return { url, source: `unavatar/twitter (${handle})` }
  }
  return null
}

export async function POST(req) {
  const { error: authErr } = await requireAdmin(req)
  if (authErr) {
    return NextResponse.json({ error: authErr }, { status: authErr === 'Unauthorized' ? 401 : 403 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const slug = String(body?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const { data: figure, error: fetchErr } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, avatar_url, twitter_handle, addresses')
    .eq('slug', slug)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!figure) return NextResponse.json({ error: `slug "${slug}" not found` }, { status: 404 })

  // Respect an admin-pinned local file (/figures/…) — those were
  // produced by the offline avatar script and shouldn't be clobbered
  // by a live unavatar URL.
  if (figure.avatar_url && String(figure.avatar_url).startsWith('/figures/')) {
    return NextResponse.json({
      ok: true,
      slug,
      avatar_url: figure.avatar_url,
      source: 'existing local file',
      note: 'avatar already pinned to a local asset, skipped',
    })
  }

  const resolved = await resolveAvatarUrl({
    addresses: figure.addresses,
    twitter_handle: figure.twitter_handle,
  })

  if (!resolved) {
    return NextResponse.json({
      ok: true,
      slug,
      avatar_url: figure.avatar_url || null,
      source: null,
      note: 'no avatar source available (no ENS, no usable twitter handle)',
    })
  }

  const { error: upErr } = await supabaseAdmin
    .from('curated_entities')
    .update({ avatar_url: resolved.url })
    .eq('slug', slug)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    slug,
    avatar_url: resolved.url,
    source: resolved.source,
  })
}
