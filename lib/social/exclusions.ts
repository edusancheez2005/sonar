/**
 * Symbols that are not "trending" in any useful sense: stablecoins (their
 * social score tracks peg news) and wrapped or staked versions of a coin
 * (the coin itself is the row people want).
 */
import { STABLECOINS as WALLET_STABLECOINS } from '@/lib/wallet/types'

export const STABLECOINS = new Set<string>([...WALLET_STABLECOINS, 'USDD', 'GHO', 'FDUSD', 'USD1', 'USDE', 'PYUSD', 'RLUSD', 'USDS', 'SUSDS', 'SUSDE', 'USDG', 'EURC'])
export const WRAPPED = new Set<string>(['WBTC', 'CBBTC', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH', 'WBNB', 'WSOL'])

export function isExcludedSymbol(symbol: unknown): boolean {
  const s = String(symbol || '').trim().toUpperCase()
  return STABLECOINS.has(s) || WRAPPED.has(s)
}

/**
 * A dollar or euro stablecoin we have not listed yet: the name says USD,
 * Dollar or Euro and the price sits within 3% of 1. (RLUSD slipped through
 * the list on 2026-10-25.)
 */
export function looksLikeStablecoin(row: { name?: unknown; symbol?: unknown; price?: unknown }): boolean {
  const label = `${row?.name || ''} ${row?.symbol || ''}`
  const price = Number(row?.price)
  return /usd|dollar|euro|eur\b/i.test(label) && Number.isFinite(price) && price > 0.97 && price < 1.03
}
