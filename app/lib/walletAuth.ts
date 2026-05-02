import 'server-only'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export interface AuthedUser {
  id: string
  email: string | null
}

/** Reads the Supabase JWT from Authorization: Bearer <token>. Returns null if absent/invalid. */
export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return null
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return null
    const { data } = await supabaseAdmin.auth.getUser(token)
    if (!data?.user) return null
    return { id: data.user.id, email: data.user.email ?? null }
  } catch {
    return null
  }
}

// Re-use the existing address regex from /api/wallet-tracker/[address]/route.js
export const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,61}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

export const SUPPORTED_CHAINS = ['ethereum','solana','polygon','arbitrum','base','optimism','bitcoin'] as const
export type SupportedChain = typeof SUPPORTED_CHAINS[number]

export function isSupportedChain(c: string | null | undefined): c is SupportedChain {
  return !!c && (SUPPORTED_CHAINS as readonly string[]).includes(c)
}
