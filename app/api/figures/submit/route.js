import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = new Set(['person', 'company', 'government', 'protocol', 'celebrity'])
const VALID_CHAINS = new Set(['ethereum', 'bitcoin', 'solana', 'polygon', 'arbitrum', 'base'])

const DESC_LIMIT = 280
const PROOF_LIMIT = 1000
const NAME_LIMIT = 120
const SLUG_LIMIT = 60
const MAX_ADDRESSES = 20

// Strip ALL HTML/script tags and control characters from user-submitted free text.
// Submissions are reviewed by a human moderator before publication; this is a
// defence-in-depth measure to ensure that even reviewer eyes never see
// rendered markup, and that nothing is ever rendered as HTML downstream.
function sanitizeFreeText(s) {
  return String(s || '')
    // strip tags
    .replace(/<[^>]*>/g, '')
    // strip control chars except \n, \r, \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // collapse runs of whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// At least one absolute http(s) URL must appear in the proof so a moderator
// can verify the claim. Defamation risk is highest for unsourced assertions.
function proofHasSourceUrl(s) {
  return /https?:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?/i.test(String(s || ''))
}

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

function validateAddress(entry) {
  if (!entry || typeof entry !== 'object') return 'address entry must be an object'
  const addr = String(entry.address || '').trim()
  const chain = String(entry.chain || '').trim().toLowerCase()
  if (!addr) return 'address is required'
  if (!VALID_CHAINS.has(chain)) return `chain must be one of ${[...VALID_CHAINS].join(', ')}`
  if (chain === 'ethereum' || chain === 'polygon' || chain === 'arbitrum' || chain === 'base') {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return `${chain} address must be 0x-prefixed 40 hex chars`
  }
  if (chain === 'bitcoin') {
    if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{10,87}$/.test(addr)) return 'invalid bitcoin address'
  }
  if (chain === 'solana') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return 'invalid solana address'
  }
  return null
}

function validateBody(body) {
  if (!body || typeof body !== 'object') return 'Invalid JSON body'
  const slug = String(body.slug || '').trim()
  const display_name = sanitizeFreeText(body.display_name)
  const description = sanitizeFreeText(body.description)
  const category = String(body.category || '').trim().toLowerCase()
  const proof = sanitizeFreeText(body.submission_proof)
  const addresses = Array.isArray(body.addresses) ? body.addresses : []

  if (!display_name) return 'display_name is required'
  if (display_name.length > NAME_LIMIT) return `display_name must be ≤ ${NAME_LIMIT} chars`
  if (!slug) return 'slug is required'
  if (slug.length > SLUG_LIMIT) return `slug must be ≤ ${SLUG_LIMIT} chars`
  if (!/^[a-z0-9-]+$/.test(slug)) return 'slug must be lowercase letters, numbers, dashes'
  if (!description) return 'description is required'
  if (description.length > DESC_LIMIT) return `description must be ≤ ${DESC_LIMIT} chars`
  if (!VALID_CATEGORIES.has(category)) {
    return `category must be one of ${[...VALID_CATEGORIES].join(', ')}`
  }
  if (!proof) return 'submission_proof is required'
  if (proof.length > PROOF_LIMIT) return `submission_proof must be ≤ ${PROOF_LIMIT} chars`
  if (!proofHasSourceUrl(proof)) {
    return 'submission_proof must contain at least one source URL (http:// or https://) so a moderator can verify the claim'
  }
  if (addresses.length === 0) return 'at least one address is required'
  if (addresses.length > MAX_ADDRESSES) return `max ${MAX_ADDRESSES} addresses per submission`
  for (const a of addresses) {
    const err = validateAddress(a)
    if (err) return err
  }
  return null
}

export async function POST(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const validationError = validateBody(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  // Conflict check — surface a friendlier error than the raw PK
  // violation we'd otherwise bubble up.
  const slug = String(body.slug).trim().toLowerCase()
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, submission_status')
    .eq('slug', slug)
    .maybeSingle()
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 })
  }
  if (existing) {
    if (existing.submission_status === 'approved') {
      return NextResponse.json(
        { error: `Slug "${slug}" already exists on Sonar. Try a different slug.` },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: `Slug "${slug}" is already queued for review.` },
      { status: 409 }
    )
  }

  const row = {
    slug,
    display_name: sanitizeFreeText(body.display_name),
    description: sanitizeFreeText(body.description),
    category: String(body.category).trim().toLowerCase(),
    twitter_handle: (() => {
      const t = String(body.twitter_handle || '').trim().replace(/^@+/, '')
      // Twitter handles: 1–15 alphanumerics + underscore. Reject anything else
      // outright rather than silently storing garbage.
      if (!t) return null
      if (!/^[A-Za-z0-9_]{1,15}$/.test(t)) return null
      return t
    })(),
    addresses: body.addresses.map((a) => ({
      address: String(a.address).trim(),
      chain: String(a.chain).trim().toLowerCase(),
      note: a.note ? sanitizeFreeText(a.note).slice(0, 200) : null,
    })),
    submission_proof: sanitizeFreeText(body.submission_proof),
    submitted_by: user.id,
    // ALWAYS pending. Approved profiles become Google-indexed; the defamation
    // and right-of-publicity risk of auto-publishing user-submitted profiles
    // about real third parties is unacceptable. A human moderator must
    // approve every row from the admin dashboard before it goes public.
    submission_status: 'pending',
    is_featured: false,
    avatar_url: null,
  }

  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .insert(row)
    .select('slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { slug: data?.slug || row.slug, status: 'pending' },
    { status: 201 }
  )
}
