import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE, isSupportedChain } from '@/app/lib/walletAuth'

export const dynamic = 'force-dynamic'

const APP_DOMAIN = 'sonartracker.io'
const APP_URI = 'https://www.sonartracker.io'

function siweMessage(address: string, nonce: string, issuedAt: string): string {
  // EIP-4361
  return [
    `${APP_DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to Sonar Tracker. This is a read-only signature — no transactions or token approvals will be requested.',
    '',
    `URI: ${APP_URI}`,
    'Version: 1',
    'Chain ID: 1',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

function solanaMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    'Sign in to Sonar Tracker',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    '',
    'This is a read-only signature. No transactions will be sent.',
  ].join('\n')
}

export async function POST(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-nonce:${ip}`, 20, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const address = String(body?.address || '').trim()
  const chain = String(body?.chain || '').trim().toLowerCase()
  if (!ADDRESS_RE.test(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  if (!isSupportedChain(chain)) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })

  const nonce = crypto.randomBytes(16).toString('hex')
  const issuedAt = new Date().toISOString()

  // EVM addresses are lowercased for storage but SIWE wants checksum-cased; we keep raw for the message
  const { error } = await supabaseAdmin.from('wallet_auth_nonces').insert({
    nonce,
    address: address.toLowerCase(),
    chain,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const message = chain === 'solana'
    ? solanaMessage(address, nonce, issuedAt)
    : siweMessage(address, nonce, issuedAt)

  return NextResponse.json({ nonce, message, issuedAt })
}
