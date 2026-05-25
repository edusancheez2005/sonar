'use client'
/**
 * useOrcaContext
 * =============================================================================
 * Route-aware hook that derives the current "focus" of the user from the
 * URL. The focus is what ORCA pins to and uses as background context for
 * the next user question — so that "why is this moving today?" on the BTC
 * token page resolves to BTC without the user repeating themselves.
 *
 * See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §4.7. Pure function; tested.
 *
 * Returned shape:
 *   null                                   — no recognisable focus
 *   { type: 'ticker',  value: 'BTC',  label: '$BTC'  }
 *   { type: 'wallet',  value: '0x..', label: '0x..'  }
 *   { type: 'tx',      value: '0x..', label: 'tx 0x..' }
 *   { type: 'whale',   value: 'id',   label: 'whale' }
 *   { type: 'list',    value: 'whales|trending|watchlist|news', label: '…' }
 */
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

const SHORT_ADDR = (a) => (a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)

/**
 * Pure derive — exported separately so tests do not need Next routing.
 * @param {string} pathname
 * @returns {{type: string, value: string, label: string} | null}
 */
export function deriveFocus(pathname) {
  if (!pathname || typeof pathname !== 'string') return null
  // Normalise: strip query/hash, collapse trailing slash.
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  const seg = clean.split('/').filter(Boolean)

  if (seg.length === 0) return null

  // /token/<symbol>
  if (seg[0] === 'token' && seg[1]) {
    const sym = seg[1].toUpperCase()
    if (/^[A-Z0-9]{2,10}$/.test(sym)) {
      return { type: 'ticker', value: sym, label: `$${sym}` }
    }
  }
  // /tokens (list)
  if (seg[0] === 'tokens') return { type: 'list', value: 'tokens', label: 'Tokens' }

  // /wallet-tracker or /wallet/<addr>
  if (seg[0] === 'wallet' && seg[1]) {
    return { type: 'wallet', value: seg[1], label: SHORT_ADDR(seg[1]) }
  }
  if (seg[0] === 'wallet-tracker') {
    return { type: 'list', value: 'wallets', label: 'Wallet tracker' }
  }

  // /tx/<hash>
  if (seg[0] === 'tx' && seg[1]) {
    return { type: 'tx', value: seg[1], label: `tx ${SHORT_ADDR(seg[1])}` }
  }

  // /whale/<id> or /whales
  if (seg[0] === 'whale' && seg[1]) {
    return { type: 'whale', value: seg[1], label: 'whale' }
  }
  if (seg[0] === 'whales' || seg[0] === 'whale-tracker') {
    return { type: 'list', value: 'whales', label: 'Whales' }
  }

  // /trending, /news, /watchlist
  if (seg[0] === 'trending') return { type: 'list', value: 'trending', label: 'Trending' }
  if (seg[0] === 'news') return { type: 'list', value: 'news', label: 'News' }
  if (seg[0] === 'watchlist') return { type: 'list', value: 'watchlist', label: 'Watchlist' }

  // /dashboard/personal
  if (seg[0] === 'dashboard' && seg[1] === 'personal') {
    return { type: 'list', value: 'personal', label: 'Personal dashboard' }
  }

  return null
}

export default function useOrcaContext() {
  const pathname = usePathname()
  return useMemo(() => deriveFocus(pathname || ''), [pathname])
}
