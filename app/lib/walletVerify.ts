import 'server-only'
import { verifyMessage } from 'viem'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const NONCE_TTL_MS = 5 * 60 * 1000

export interface VerifyInput {
  address: string
  chain: string
  signature: string
  nonce: string
  message: string
}

export async function consumeNonce(nonce: string, address: string, chain: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('wallet_auth_nonces')
    .select('nonce, address, chain, issued_at, consumed_at')
    .eq('nonce', nonce)
    .maybeSingle()
  if (error || !data) return false
  if (data.consumed_at) return false
  if (data.address !== address.toLowerCase()) return false
  if (data.chain !== chain) return false
  const issued = new Date(data.issued_at).getTime()
  if (isNaN(issued) || Date.now() - issued > NONCE_TTL_MS) return false
  const { error: upErr } = await supabaseAdmin
    .from('wallet_auth_nonces')
    .update({ consumed_at: new Date().toISOString() })
    .eq('nonce', nonce)
    .is('consumed_at', null)
  if (upErr) return false
  return true
}

export async function verifyWalletSignature(input: VerifyInput): Promise<{ ok: boolean; error?: string }> {
  const { address, chain, signature, message } = input
  try {
    if (chain === 'solana') {
      const sig = bs58.decode(signature)
      const pub = bs58.decode(address)
      const ok = nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pub)
      return ok ? { ok: true } : { ok: false, error: 'bad signature' }
    }
    // EVM
    const ok = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
    return ok ? { ok: true } : { ok: false, error: 'bad signature' }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'verify error' }
  }
}

/** Generate a Supabase session for the user via magiclink token exchange. */
export async function mintSessionForUser(email: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error || !data) return null
  // verifyOtp with the token_hash exchanges it for a session under the service-role client
  const props = (data as any)?.properties
  const tokenHash = props?.hashed_token || props?.token_hash
  if (!tokenHash) return null
  const { data: vData, error: vErr } = await supabaseAdmin.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (vErr || !vData?.session) return null
  return {
    access_token: vData.session.access_token,
    refresh_token: vData.session.refresh_token,
  }
}
