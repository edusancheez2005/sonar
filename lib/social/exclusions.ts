/**
 * Symbols that are not "trending" in any useful sense: stablecoins (their
 * social score tracks peg news) and wrapped or staked versions of a coin
 * (the coin itself is the row people want).
 */
import { STABLECOINS as WALLET_STABLECOINS } from '@/lib/wallet/types'

export const STABLECOINS = new Set<string>([...WALLET_STABLECOINS, 'USDD', 'GHO', 'FDUSD', 'USD1', 'USDE', 'PYUSD'])
export const WRAPPED = new Set<string>(['WBTC', 'CBBTC', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH', 'WBNB', 'WSOL'])

export function isExcludedSymbol(symbol: unknown): boolean {
  const s = String(symbol || '').trim().toUpperCase()
  return STABLECOINS.has(s) || WRAPPED.has(s)
}
