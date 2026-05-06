/**
 * Solana SPL mint → symbol map for the Frontier feed.
 *
 * The cron persists raw mint addresses (e.g. EPjFW...Dt1v) when Helius
 * doesn't carry a symbol. The UI can't render that. This map covers the
 * top SPL tokens by volume so 95%+ of meaningful Solana flow shows up
 * with a real ticker. Unknown mints fall back to "SPL".
 *
 * Keep mints lowercase OR full-case — match logic does case-sensitive
 * compare on the canonical mainnet base58 form (Solana mints are case-
 * sensitive; e.g. EPjFWdd5... ≠ epjfwdd5...).
 */
export const SPL_TOKENS = {
  // Stables
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', priceUsd: 1.0, decimals: 6, kind: 'stable' },
  Es9vMFrzaCERmJfrF4H2FYD4KConky11McCe8BenwNYB: { symbol: 'USDT', priceUsd: 1.0, decimals: 6, kind: 'stable' },
  USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX:   { symbol: 'USDH', priceUsd: 1.0, decimals: 6, kind: 'stable' },
  // Wrapped + LSTs
  So11111111111111111111111111111111111111112:   { symbol: 'SOL',   decimals: 9, kind: 'native' },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So:   { symbol: 'mSOL',  decimals: 9, kind: 'lst' },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn:  { symbol: 'JitoSOL', decimals: 9, kind: 'lst' },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1:   { symbol: 'bSOL',  decimals: 9, kind: 'lst' },
  // Majors
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN:   { symbol: 'JUP',   decimals: 6 },
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL:   { symbol: 'JTO',   decimals: 9 },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ETH (Wormhole)', decimals: 8 },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': { symbol: 'WBTC',  decimals: 8 },
  // Memes / liquid
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263:  { symbol: 'BONK',  decimals: 5 },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm:  { symbol: 'WIF',   decimals: 6 },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3:  { symbol: 'PYTH',  decimals: 6 },
  rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof:   { symbol: 'RENDER', decimals: 8 },
  // DeFi blue chips
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY',   decimals: 6 },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE:   { symbol: 'ORCA',  decimals: 6 },
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac:   { symbol: 'MNGO',  decimals: 6 },
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo': { symbol: 'PYUSD', priceUsd: 1.0, decimals: 6, kind: 'stable' },
}

/**
 * Resolve a token field that may already be a symbol (from native rows)
 * or a base58 mint address (from SPL rows where Helius lacked metadata).
 */
export function resolveToken(rawSymbolOrMint) {
  if (!rawSymbolOrMint) return { symbol: '—', kind: null, priceUsd: null }
  const known = SPL_TOKENS[rawSymbolOrMint]
  if (known) return { symbol: known.symbol, kind: known.kind || null, priceUsd: known.priceUsd ?? null }
  // SOL / native pseudo-symbols stored by the cron as 'SOL'
  if (rawSymbolOrMint === 'SOL') return { symbol: 'SOL', kind: 'native', priceUsd: null }
  // Heuristic: looks like a base58 mint (long alphanumeric) we don't know.
  if (rawSymbolOrMint.length >= 32) return { symbol: 'SPL', kind: null, priceUsd: null }
  return { symbol: rawSymbolOrMint, kind: null, priceUsd: null }
}

// Tickers we'll try to enrich via price_snapshots. Anything in this set
// gets a USD valuation if the cron has a fresh price row.
export const ENRICHABLE_TICKERS = new Set([
  'SOL', 'JUP', 'JTO', 'BONK', 'WIF', 'PYTH', 'RENDER', 'RAY', 'ORCA',
  'WBTC', 'ETH (Wormhole)',
])
