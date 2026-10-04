/**
 * Every stored spelling of a wallet address. EVM addresses show up lower-case
 * (whale tape), EIP-55 checksummed (curated entities, the tracked-address
 * poller) or however a URL had them; Solana base58 is case-sensitive and has
 * one spelling.
 */
import { getAddress } from 'viem'

export const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export function addressVariants(address: string): string[] {
  const a = String(address || '').trim()
  const forms = new Set<string>([a])
  if (EVM_ADDRESS_RE.test(a)) {
    const lower = a.toLowerCase()
    forms.add(lower)
    try {
      forms.add(getAddress(lower))
    } catch {
      /* keep the two forms */
    }
  }
  return Array.from(forms)
}

/** Canonical storage form: lower-case for EVM, unchanged otherwise. */
export function canonicalAddress(address: string): string {
  const a = String(address || '').trim()
  return EVM_ADDRESS_RE.test(a) ? a.toLowerCase() : a
}

export function sameAddress(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  return canonicalAddress(a) === canonicalAddress(b)
}
