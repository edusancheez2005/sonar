import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'sonar_guest_wallet'
const MAX_AGE_SECONDS = 60 * 60 * 24 // 24h

export interface GuestWallet {
  address: string
  chain: string
  tokens: string[]
}

function secret(): string {
  return process.env.GUEST_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE || 'dev-fallback-secret-do-not-use-in-prod'
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

function encode(data: GuestWallet): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function decode(raw: string | undefined): GuestWallet | null {
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  if (sign(payload) !== sig) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GuestWallet
  } catch {
    return null
  }
}

export async function readGuestWallet(): Promise<GuestWallet | null> {
  const c = await cookies()
  return decode(c.get(COOKIE_NAME)?.value)
}

export async function writeGuestWallet(data: GuestWallet): Promise<void> {
  const c = await cookies()
  c.set(COOKIE_NAME, encode(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearGuestWallet(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}
