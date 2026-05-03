import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE, isSupportedChain, getUserFromRequest } from '@/app/lib/walletAuth'
import { consumeNonce, verifyWalletSignature } from '@/app/lib/walletVerify'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-link:${ip}`, 20, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const addressRaw = String(body?.address || '').trim()
  const chain = String(body?.chain || '').trim().toLowerCase()
  const signature = String(body?.signature || '')
  const nonce = String(body?.nonce || '')
  const message = String(body?.message || '')
  const label = body?.label ? String(body.label).slice(0, 80) : null

  if (!ADDRESS_RE.test(addressRaw)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  if (!isSupportedChain(chain)) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })

  const ok = await consumeNonce(nonce, addressRaw, chain)
  if (!ok) return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 })

  const v = await verifyWalletSignature({ address: addressRaw, chain, signature, nonce, message })
  if (!v.ok) return NextResponse.json({ error: v.error || 'signature invalid' }, { status: 401 })

  const address = addressRaw.toLowerCase()

  // Reject if this wallet is already linked to a different user
  const { data: existing } = await supabaseAdmin
    .from('wallet_identities')
    .select('id, user_id')
    .eq('address', address)
    .eq('chain', chain)
    .maybeSingle()

  if (existing && existing.user_id && existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Wallet already linked to a different account' }, { status: 409 })
  }

  const nowIso = new Date().toISOString()
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('wallet_identities')
      .update({ verified_at: nowIso, label: label ?? undefined })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_identities')
    .insert({
      user_id: user.id,
      address,
      chain,
      verified_at: nowIso,
      label,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
