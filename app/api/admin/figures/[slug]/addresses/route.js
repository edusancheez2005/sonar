import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isAdmin } from '@/app/lib/adminConfig'

export const dynamic = 'force-dynamic'

// ─── Validation ─────────────────────────────────────────────────────────
// Conservative per-chain regexes. We only accept chains we actively
// support in the wallet tracker. Adding a chain here also requires
// front-end + lib/wallet-tracker support; do not loosen blindly.
const VALID_CHAINS = new Set([
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'bsc',
  'avalanche',
  'solana',
  'bitcoin',
])

const EVM_CHAINS = new Set(['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'])

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
// Solana base58, 32-44 chars, no 0/O/I/l (bs58 alphabet)
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
// Bitcoin: legacy P2PKH/P2SH (1.., 3..) and bech32 (bc1..)
const BTC_LEGACY = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const BTC_BECH32 = /^bc1[02-9ac-hj-np-z]{6,87}$/

function validateAddress(address, chain) {
  if (typeof address !== 'string') return 'address must be a string'
  const trimmed = address.trim()
  if (!trimmed) return 'address is required'
  if (!VALID_CHAINS.has(chain)) {
    return `chain must be one of: ${[...VALID_CHAINS].join(', ')}`
  }
  if (EVM_CHAINS.has(chain)) {
    if (!EVM_ADDRESS.test(trimmed)) return 'invalid EVM address (expected 0x + 40 hex chars)'
  } else if (chain === 'solana') {
    if (!SOLANA_ADDRESS.test(trimmed)) return 'invalid Solana address (base58, 32-44 chars)'
  } else if (chain === 'bitcoin') {
    if (!BTC_LEGACY.test(trimmed) && !BTC_BECH32.test(trimmed)) {
      return 'invalid Bitcoin address (legacy or bech32)'
    }
  }
  return null
}

// EVM addresses are case-insensitive but we preserve the user-supplied
// (presumably checksummed) casing for display. For dedupe we compare
// lowercased EVM addresses; Solana / BTC stay case-sensitive.
function normalizeForCompare(address, chain) {
  return EVM_CHAINS.has(chain) ? address.toLowerCase() : address
}

// ─── Auth ───────────────────────────────────────────────────────────────
async function requireAdmin(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { user: null, error: 'Unauthorized', status: 401 }
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { user: null, error: 'Unauthorized', status: 401 }
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return { user: null, error: 'Unauthorized', status: 401 }
  if (!isAdmin(user.email)) return { user, error: 'Forbidden', status: 403 }
  return { user, error: null, status: 200 }
}

async function loadEntity(slug) {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, addresses, is_featured')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  // Ensure addresses is always an array even on legacy NULL rows.
  return { ...data, addresses: Array.isArray(data.addresses) ? data.addresses : [] }
}

// ─── POST: append a new address ─────────────────────────────────────────
export async function POST(req, { params }) {
  const { error: authErr, status: authStatus, user } = await requireAdmin(req)
  if (authErr) return NextResponse.json({ error: authErr }, { status: authStatus })

  const slug = String(params?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const address = String(body?.address || '').trim()
  const chain = String(body?.chain || '').trim().toLowerCase()
  const note = body?.note ? String(body.note).trim().slice(0, 280) : ''
  const source = body?.source ? String(body.source).trim().slice(0, 500) : ''
  const verified = body?.verified === true

  const validationErr = validateAddress(address, chain)
  if (validationErr) return NextResponse.json({ error: validationErr }, { status: 400 })

  // Provenance discipline: an admin marking `verified:true` MUST cite
  // a source URL. Unverified rows can ship without provenance but they
  // do not get featured.
  if (verified && !source) {
    return NextResponse.json(
      { error: 'source URL is required when verified=true' },
      { status: 400 }
    )
  }
  if (source && !/^https?:\/\//i.test(source)) {
    return NextResponse.json({ error: 'source must be an http(s) URL' }, { status: 400 })
  }

  const entity = await loadEntity(slug)
  if (!entity) return NextResponse.json({ error: 'figure not found' }, { status: 404 })

  // Dedupe: same (chain, normalized address) is a no-op.
  const compareNew = normalizeForCompare(address, chain)
  const exists = entity.addresses.some(
    (a) => a?.chain === chain && normalizeForCompare(String(a?.address || ''), chain) === compareNew
  )
  if (exists) {
    return NextResponse.json(
      { error: 'address already attached to this figure' },
      { status: 409 }
    )
  }

  const newRow = {
    address,
    chain,
    note,
    source,
    verified,
    added_by: user.email || null,
    added_at: new Date().toISOString(),
  }

  const nextAddresses = [...entity.addresses, newRow]

  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .update({ addresses: nextAddresses })
    .eq('slug', slug)
    .select('slug, addresses, is_featured')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row: data, added: newRow })
}

// ─── DELETE: remove an address by (chain, address) ──────────────────────
export async function DELETE(req, { params }) {
  const { error: authErr, status: authStatus } = await requireAdmin(req)
  if (authErr) return NextResponse.json({ error: authErr }, { status: authStatus })

  const slug = String(params?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const url = new URL(req.url)
  const address = String(url.searchParams.get('address') || '').trim()
  const chain = String(url.searchParams.get('chain') || '').trim().toLowerCase()

  if (!address || !chain) {
    return NextResponse.json(
      { error: 'address and chain query params are required' },
      { status: 400 }
    )
  }
  if (!VALID_CHAINS.has(chain)) {
    return NextResponse.json({ error: 'invalid chain' }, { status: 400 })
  }

  const entity = await loadEntity(slug)
  if (!entity) return NextResponse.json({ error: 'figure not found' }, { status: 404 })

  const compareTarget = normalizeForCompare(address, chain)
  const before = entity.addresses.length
  const nextAddresses = entity.addresses.filter(
    (a) =>
      !(a?.chain === chain && normalizeForCompare(String(a?.address || ''), chain) === compareTarget)
  )

  if (nextAddresses.length === before) {
    return NextResponse.json({ error: 'address not found on this figure' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .update({ addresses: nextAddresses })
    .eq('slug', slug)
    .select('slug, addresses, is_featured')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row: data, removed_count: before - nextAddresses.length })
}

// ─── PATCH: toggle is_featured (and only is_featured for now) ───────────
// Address-row metadata edits would race against POST/DELETE, so we
// keep this endpoint scoped to the entity-level featured flag. For
// note/source corrections, delete + re-POST.
export async function PATCH(req, { params }) {
  const { error: authErr, status: authStatus } = await requireAdmin(req)
  if (authErr) return NextResponse.json({ error: authErr }, { status: authStatus })

  const slug = String(params?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body?.is_featured !== 'boolean') {
    return NextResponse.json({ error: 'is_featured (boolean) is required' }, { status: 400 })
  }

  const entity = await loadEntity(slug)
  if (!entity) return NextResponse.json({ error: 'figure not found' }, { status: 404 })

  // Refuse to feature a figure with zero addresses — featuring an
  // empty profile would surface a dead card on the public hub.
  if (body.is_featured && entity.addresses.length === 0) {
    return NextResponse.json(
      { error: 'cannot feature a figure with no addresses' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .update({ is_featured: body.is_featured })
    .eq('slug', slug)
    .select('slug, is_featured, addresses')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row: data })
}
