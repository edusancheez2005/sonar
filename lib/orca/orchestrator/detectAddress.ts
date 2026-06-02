/**
 * detectAddress — detect a crypto wallet address + its chain from free text.
 * =============================================================================
 * Voice writes — trackWallet / untrackWallet (2026-06-02).
 *
 * Pure, dependency-free. Returns the first address found and a best-effort
 * chain. EVM addresses default to `eth` unless the surrounding text names a
 * specific EVM chain ("on bsc", "base", "polygon", etc.) — we NEVER silently
 * guess between EVM chains. The user can edit the chain later from the
 * Wallets tab.
 *
 * Chain enum mirrors the `user_wallets` table CHECK constraint:
 *   eth | btc | sol | base | arb | polygon | bsc | tron | xrp
 */

export type Chain = 'eth' | 'btc' | 'sol' | 'base' | 'arb' | 'polygon' | 'bsc' | 'tron' | 'xrp'

export interface DetectedAddress {
  address: string
  chain: Chain
}

const EVM_RE = /\b0x[a-fA-F0-9]{40}\b/
const TRON_RE = /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/
const BTC_BECH32_RE = /\bbc1[a-z0-9]{20,90}\b/
const BTC_LEGACY_RE = /\b[13][A-HJ-NP-Za-km-z1-9]{25,39}\b/
const XRP_RE = /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/
const SOL_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/

// Chain-hint phrases → canonical Chain. Longer / more specific aliases first.
const CHAIN_HINTS: Array<{ re: RegExp; chain: Chain }> = [
  { re: /\b(ethereum|eth|erc-?20|mainnet)\b/i, chain: 'eth' },
  { re: /\b(bitcoin|btc)\b/i, chain: 'btc' },
  { re: /\b(solana|sol)\b/i, chain: 'sol' },
  { re: /\b(base)\b/i, chain: 'base' },
  { re: /\b(arbitrum|arb)\b/i, chain: 'arb' },
  { re: /\b(polygon|matic)\b/i, chain: 'polygon' },
  { re: /\b(bsc|bnb|binance)\b/i, chain: 'bsc' },
  { re: /\b(tron|trx)\b/i, chain: 'tron' },
  { re: /\b(xrp|ripple)\b/i, chain: 'xrp' },
]

const EVM_CHAINS = new Set<Chain>(['eth', 'base', 'arb', 'polygon', 'bsc'])

function detectChainHint(text: string): Chain | null {
  for (const { re, chain } of CHAIN_HINTS) {
    if (re.test(text)) return chain
  }
  return null
}

export function detectAddress(text: string): DetectedAddress | null {
  if (typeof text !== 'string' || !text.trim()) return null

  const hint = detectChainHint(text)

  // EVM 40-hex — chain ambiguous across eth/base/arb/polygon/bsc.
  const evm = text.match(EVM_RE)
  if (evm) {
    const chain: Chain = hint && EVM_CHAINS.has(hint) ? hint : 'eth'
    return { address: evm[0], chain }
  }

  // Tron — distinctive 'T' + 33 base58 chars (check before SOL base58).
  const tron = text.match(TRON_RE)
  if (tron) return { address: tron[0], chain: 'tron' }

  // BTC bech32, then legacy.
  const bech = text.match(BTC_BECH32_RE)
  if (bech) return { address: bech[0], chain: 'btc' }

  // XRP — 'r' prefix (check before BTC legacy / SOL which can also start with r-less base58).
  const xrp = text.match(XRP_RE)
  if (xrp) return { address: xrp[0], chain: 'xrp' }

  const legacy = text.match(BTC_LEGACY_RE)
  if (legacy) return { address: legacy[0], chain: 'btc' }

  // SOL base58 — last resort (broadest pattern).
  const sol = text.match(SOL_RE)
  if (sol) return { address: sol[0], chain: 'sol' }

  return null
}

export const __internals = { detectChainHint, EVM_CHAINS }
