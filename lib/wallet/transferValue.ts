/**
 * USD value of a tracked_address_transfers row.
 * =============================================================================
 * The tracked-address poller only fills amount_usd for tokens CoinGecko knows
 * (a handful of lookups per run) and never for native coins (contract ''), so
 * a 500 ETH transfer from a followed wallet arrives with amount_usd NULL. This
 * values a row as:
 *   1. amount_usd when the poller set it;
 *   2. native coin (contract '' / null) × the latest price_snapshots price;
 *   3. a short allowlist of stablecoin CONTRACTS at $1 (never by symbol —
 *      address-poisoning spam reuses the "USDT"/"USDC" symbols).
 * Anything else (unknown tokens, airdrop spam such as "ODYSSEY") is null.
 */

export const NATIVE_TICKER_BY_CHAIN: Record<string, string> = {
  ethereum: 'ETH',
  base: 'ETH',
  arbitrum: 'ETH',
  arbitrum_one: 'ETH',
  optimism: 'ETH',
  polygon: 'POL',
  solana: 'SOL',
  bsc: 'BNB',
}

// EVM contracts are compared lower-case; Solana mints are case-sensitive.
const STABLE_CONTRACTS = new Set<string>([
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT  ethereum
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC  ethereum
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI   ethereum
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC  polygon
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e polygon
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT  polygon
  '0x55d398326f99059ff775485246999027b3197955', // USDT  bsc
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC  bsc
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC solana
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT solana
])

export type NativePrices = Record<string, number>

type SupabaseLike = { from: (table: string) => any }

const PRICE_TTL_MS = 5 * 60 * 1000
let priceCache: { at: number; prices: NativePrices } | null = null

/** Latest USD price per native ticker (ETH, POL, SOL, BNB); cached 5 min per instance. */
export async function loadNativePrices(supabase: SupabaseLike, nowMs: number = Date.now()): Promise<NativePrices> {
  if (priceCache && nowMs - priceCache.at < PRICE_TTL_MS) return priceCache.prices
  const tickers = Array.from(new Set(Object.values(NATIVE_TICKER_BY_CHAIN)))
  const prices: NativePrices = {}
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const { data } = await supabase
          .from('price_snapshots')
          .select('price_usd, timestamp')
          .eq('ticker', t)
          .order('timestamp', { ascending: false })
          .limit(1)
        const p = Number(Array.isArray(data) && data[0] ? data[0].price_usd : NaN)
        if (Number.isFinite(p) && p > 0) prices[t] = p
      } catch {
        /* leave unpriced */
      }
    })
  )
  priceCache = { at: nowMs, prices }
  return prices
}

/** Test hook: forget cached prices. */
export function _resetNativePriceCache(): void {
  priceCache = null
}

export interface TrackedTransferLike {
  chain?: string | null
  contract?: string | null
  amount?: number | string | null
  amount_usd?: number | string | null
}

export function transferUsd(row: TrackedTransferLike, prices: NativePrices): number | null {
  const stored = Number(row?.amount_usd)
  if (Number.isFinite(stored) && stored > 0) return stored
  const amount = Number(row?.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const contract = String(row?.contract ?? '').trim()
  if (!contract) {
    const ticker = NATIVE_TICKER_BY_CHAIN[String(row?.chain || '').toLowerCase()]
    const price = ticker ? prices[ticker] : undefined
    return price ? amount * price : null
  }
  if (STABLE_CONTRACTS.has(contract) || STABLE_CONTRACTS.has(contract.toLowerCase())) return amount
  return null
}
