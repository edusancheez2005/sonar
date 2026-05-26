/**
 * contextFromPath — Stage D (2026-05-26)
 * =============================================================================
 * Pure helper used by the Ask ORCA drawer to derive a `{ ticker, wallet }`
 * context from the current pathname. Lets the embedded drawer pre-fill
 * suggested chips and seed Confirm prompts with the most-likely subject of
 * the page the user is currently looking at.
 *
 * Recognised routes:
 *   /token/<symbol>            -> { ticker: SYMBOL }
 *   /tokens/<symbol>           -> { ticker: SYMBOL }
 *   /whale/<address>           -> { wallet: ADDRESS }
 *   /whales/<address>          -> { wallet: ADDRESS }
 *   /wallet-tracker/<address>  -> { wallet: ADDRESS }
 *   /entity/<id>               -> {} (entity slugs aren't tickers)
 *   anything else              -> {}
 *
 * Tickers are upper-cased; a leading `$` is stripped. Wallet addresses are
 * lightly sanity-checked (EVM 0x… or 32-44 char base58) but NOT URI-decoded
 * here — callers should already pass the decoded pathname segment.
 *
 * This module has zero React or Next dependencies so it is trivially
 * testable in vitest's node env.
 */

export interface OrcaContext {
  ticker?: string
  wallet?: string
}

const TICKER_RE = /^[A-Z0-9._-]{1,12}$/
const EVM_RE = /^0x[0-9a-fA-F]{40}$/
const SOL_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

const TOKEN_PREFIXES = ['/token/', '/tokens/']
const WALLET_PREFIXES = ['/whale/', '/whales/', '/wallet-tracker/']

function extractFirstSegment(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  if (!rest) return null
  // Drop everything after a slash, `?`, or `#`.
  const seg = rest.split(/[/?#]/)[0]
  if (!seg) return null
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

export function contextFromPath(pathname: string | null | undefined): OrcaContext {
  if (!pathname || typeof pathname !== 'string') return {}

  for (const prefix of TOKEN_PREFIXES) {
    const seg = extractFirstSegment(pathname, prefix)
    if (seg) {
      const normalised = seg.replace(/^\$/, '').toUpperCase()
      if (TICKER_RE.test(normalised)) return { ticker: normalised }
      return {}
    }
  }

  for (const prefix of WALLET_PREFIXES) {
    const seg = extractFirstSegment(pathname, prefix)
    if (seg) {
      if (EVM_RE.test(seg) || SOL_BASE58_RE.test(seg)) return { wallet: seg }
      return {}
    }
  }

  return {}
}

/**
 * Routes where the drawer / pill should NOT be shown:
 *   - the dedicated Ask ORCA pages (`/ai`, `/ai-advisor`) already are ORCA
 *   - the marketing landing page (`/`) keeps a clean hero
 *   - auth, legal, and other minimal flows
 */
const HIDE_DRAWER_PREFIXES = [
  '/ai',
  '/ai-advisor',
  '/auth',
  '/legal',
  '/privacy',
  '/terms',
  '/subscribe',
]

export function shouldShowDrawer(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false
  if (pathname === '/') return false
  for (const p of HIDE_DRAWER_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + '/') || pathname === p + '/') {
      return false
    }
  }
  return true
}
