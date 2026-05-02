import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE, isSupportedChain } from '@/app/lib/walletAuth'
import { consumeNonce, verifyWalletSignature, mintSessionForUser } from '@/app/lib/walletVerify'

export const dynamic = 'force-dynamic'

const SANCTIONED = new Set([
  'cuba', 'iran', 'north korea', 'dprk', 'syria', 'crimea',
  'donetsk', 'luhansk', 'russia', 'belarus',
])

export async function POST(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-verify:${ip}`, 20, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const addressRaw = String(body?.address || '').trim()
  const chain = String(body?.chain || '').trim().toLowerCase()
  const signature = String(body?.signature || '')
  const nonce = String(body?.nonce || '')
  const message = String(body?.message || '')

  if (!ADDRESS_RE.test(addressRaw)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  if (!isSupportedChain(chain)) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
  if (!signature || !nonce || !message) return NextResponse.json({ error: 'Missing signature/nonce/message' }, { status: 400 })

  // Eligibility attestations (only required when this is a NEW signup)
  const over18 = body?.over18 === true
  const acceptsTerms = body?.acceptsTerms === true
  const notSanctioned = body?.notSanctioned === true
  const country = String(body?.country || '').trim().slice(0, 100)

  const ok = await consumeNonce(nonce, addressRaw, chain)
  if (!ok) return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 })

  const v = await verifyWalletSignature({ address: addressRaw, chain, signature, nonce, message })
  if (!v.ok) return NextResponse.json({ error: v.error || 'signature invalid' }, { status: 401 })

  const address = addressRaw.toLowerCase()

  // Look up existing identity
  const { data: existing } = await supabaseAdmin
    .from('wallet_identities')
    .select('id, user_id')
    .eq('address', address)
    .eq('chain', chain)
    .maybeSingle()

  let userId = existing?.user_id as string | undefined
  let email: string

  if (userId) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId)
    email = u?.user?.email || `${address}@wallet.sonartracker.io`
    // Existing wallet → just refresh verified_at
    await supabaseAdmin
      .from('wallet_identities')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', existing!.id)
  } else {
    // NEW signup → require attestations
    if (!over18 || !acceptsTerms || !notSanctioned) {
      return NextResponse.json({
        error: 'You must confirm 18+, accept the Terms, and confirm you are not in a sanctioned jurisdiction.',
        needsAttestations: true,
      }, { status: 400 })
    }
    if (country && SANCTIONED.has(country.toLowerCase())) {
      return NextResponse.json({ error: 'Service is not available in your jurisdiction.' }, { status: 451 })
    }

    email = `${address}@wallet.sonartracker.io`
    const password = crypto.randomBytes(32).toString('base64url')
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { wallet_address: address, wallet_chain: chain, signup_method: 'wallet' },
    })
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 500 })
    }
    userId = created.user.id

    const nowIso = new Date().toISOString()
    const ua = (req.headers.get('user-agent') || '').slice(0, 500)
    await supabaseAdmin.from('profiles').update({
      over_18_confirmed_at: nowIso,
      terms_accepted_at: nowIso,
      sanctions_attestation_at: nowIso,
      signup_ip: ip,
      signup_user_agent: ua,
    }).eq('id', userId)

    await supabaseAdmin.from('wallet_identities').insert({
      user_id: userId,
      address,
      chain,
      is_primary: true,
      verified_at: nowIso,
    })
  }

  const session = await mintSessionForUser(email)
  if (!session) return NextResponse.json({ error: 'Failed to mint session' }, { status: 500 })

  return NextResponse.json({
    user: { id: userId, email },
    session,
  })
}
