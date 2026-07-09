import { describe, it, expect, vi } from 'vitest'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

// walletVerify.ts pulls in `server-only` and the Supabase admin client at module
// load. Neither is needed to exercise verifyWalletSignature (pure crypto + the
// nonce/address binding checks), so stub them out.
vi.mock('server-only', () => ({}))
vi.mock('@/app/lib/supabaseAdmin', () => ({ supabaseAdmin: {}, supabaseAdminFresh: {} }))

import { verifyWalletSignature } from '@/app/lib/walletVerify'

// A canonical Solana challenge, matching the template in
// app/api/auth/wallet/nonce/route.ts (the `Nonce: <nonce>` line is what binds
// the signature to a single, freshly-issued challenge).
function solanaMessage(address: string, nonce: string): string {
  return [
    'Sign in to Sonar Tracker',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    'Issued At: 2026-07-09T00:00:00.000Z',
    '',
    'This is a read-only signature. No transactions will be sent.',
  ].join('\n')
}

function sign(message: string, secretKey: Uint8Array): string {
  const sig = nacl.sign.detached(new TextEncoder().encode(message), secretKey)
  return bs58.encode(sig)
}

describe('verifyWalletSignature — nonce binding (SIWE replay defence)', () => {
  const kp = nacl.sign.keyPair()
  const address = bs58.encode(kp.publicKey)
  const nonce = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'

  it('accepts a signature over the exact issued challenge', async () => {
    const message = solanaMessage(address, nonce)
    const signature = sign(message, kp.secretKey)
    const res = await verifyWalletSignature({ address, chain: 'solana', signature, nonce, message })
    expect(res.ok).toBe(true)
  })

  it('rejects a replayed signature whose message does not contain the issued nonce', async () => {
    // Attacker replays a genuine signature the victim produced over some OTHER
    // message (here: a different nonce). The crypto is valid, but the message is
    // not bound to THIS challenge, so it must be rejected.
    const otherMessage = solanaMessage(address, 'ffffffffffffffffffffffffffffffff')
    const signature = sign(otherMessage, kp.secretKey)
    const res = await verifyWalletSignature({
      address, chain: 'solana', signature, nonce, message: otherMessage,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/nonce not bound/i)
  })

  it('rejects when the signed message is for a different address', async () => {
    const other = nacl.sign.keyPair()
    const otherAddress = bs58.encode(other.publicKey)
    const message = solanaMessage(otherAddress, nonce) // nonce present, wrong address
    const signature = sign(message, other.secretKey)
    const res = await verifyWalletSignature({
      address, chain: 'solana', signature, nonce, message,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/address not bound/i)
  })

  it('rejects an empty nonce even if the message would otherwise verify', async () => {
    const message = solanaMessage(address, '')
    const signature = sign(message, kp.secretKey)
    const res = await verifyWalletSignature({ address, chain: 'solana', signature, nonce: '', message })
    expect(res.ok).toBe(false)
  })
})
