import 'server-only'
import type { BacktestChain } from '../wallet-backtest/types'

// ─── In-memory historical price cache ────────────────────────────────────
// Keyed by (chain, contractOrId, startBucket, endBucket). The cache is
// process-local; on Vercel each lambda invocation may have its own
// copy, but warm invocations get a real hit. For sustained traffic we
// can promote this to a Supabase table later.

interface CacheEntry {
  series: PricePoint[]
  fetched_at: number
}

export interface PricePoint {
  ts: number     // unix ms
  price_usd: number
}

const TTL_MS = 60 * 60 * 1000 // 1 hour
const memCache = new Map<string, CacheEntry>()

function cacheKey(parts: string[]) {
  return parts.join('|')
}

// CoinGecko `platform` ids for our supported chains. `null` for chains
// (like Bitcoin) where we use a coin id directly instead of a contract.
const PLATFORM: Partial<Record<BacktestChain, string>> = {
  ethereum: 'ethereum',
  polygon: 'polygon-pos',
  solana: 'solana',
}

// Native asset coingecko ids per chain — used when the trade leg is
// the chain's native token (no contract address).
export const NATIVE_COINGECKO: Record<BacktestChain, string> = {
  ethereum: 'ethereum',
  polygon: 'matic-network',
  solana: 'solana',
}

// ─── HTTP ────────────────────────────────────────────────────────────────
// Prefer the Pro API when the key is present, fall back to the public
// endpoint. The free endpoint is rate-limited to ~30 req/min so this
// only works at small scale; the cache is essential.
function buildUrl(path: string, params: Record<string, string | number>) {
  const apiKey = process.env.COINGECKO_API_KEY
  const base = apiKey
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3'
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  if (apiKey) qs.set('x_cg_pro_api_key', apiKey)
  return `${base}${path}?${qs.toString()}`
}

async function fetchJson(url: string, retries = 2): Promise<any> {
  let lastErr: any = null
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.status === 429) {
        // Backoff briefly on rate limits before retrying.
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
        continue
      }
      if (!res.ok) throw new Error(`coingecko ${res.status}`)
      return await res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('coingecko fetch failed')
}

// ─── Public API ──────────────────────────────────────────────────────────
/**
 * Fetch hourly OHLC-equivalent (timestamp, price_usd) for a token in
 * [from, to]. CoinGecko returns daily granularity for ranges > 90 days
 * and hourly for shorter ranges — that's fine for our use case.
 *
 * `tokenRef` is either:
 *   - { kind: 'coin_id', id: 'ethereum' }  for native / well-known assets
 *   - { kind: 'contract', chain, contract } for ERC-20 / SPL tokens
 *
 * Returns [] if the token has no price history (rugged, delisted, or
 * never listed). Callers MUST handle the empty case — see engine.ts
 * which marks unpriceable holdings to zero.
 */
export type TokenRef =
  | { kind: 'coin_id'; id: string }
  | { kind: 'contract'; chain: BacktestChain; contract: string }

export async function getPriceSeries(
  tokenRef: TokenRef,
  from: number,
  to: number
): Promise<PricePoint[]> {
  const fromSec = Math.floor(from / 1000)
  const toSec = Math.floor(to / 1000)

  // Round buckets to the nearest hour so cache hits don't churn on
  // sub-second drift between user requests.
  const bucketHr = 3600
  const fromBucket = Math.floor(fromSec / bucketHr) * bucketHr
  const toBucket = Math.ceil(toSec / bucketHr) * bucketHr

  const key =
    tokenRef.kind === 'coin_id'
      ? cacheKey(['cid', tokenRef.id, String(fromBucket), String(toBucket)])
      : cacheKey([
          'ctr',
          tokenRef.chain,
          tokenRef.contract.toLowerCase(),
          String(fromBucket),
          String(toBucket),
        ])

  const cached = memCache.get(key)
  if (cached && Date.now() - cached.fetched_at < TTL_MS) {
    return cached.series
  }

  let url: string
  if (tokenRef.kind === 'coin_id') {
    url = buildUrl(`/coins/${encodeURIComponent(tokenRef.id)}/market_chart/range`, {
      vs_currency: 'usd',
      from: fromBucket,
      to: toBucket,
    })
  } else {
    const platform = PLATFORM[tokenRef.chain]
    if (!platform) return []
    url = buildUrl(
      `/coins/${platform}/contract/${tokenRef.contract.toLowerCase()}/market_chart/range`,
      {
        vs_currency: 'usd',
        from: fromBucket,
        to: toBucket,
      }
    )
  }

  let json: any
  try {
    json = await fetchJson(url)
  } catch {
    // 404 → token never listed → empty series. Engine will mark to 0.
    memCache.set(key, { series: [], fetched_at: Date.now() })
    return []
  }

  const prices: [number, number][] = Array.isArray(json?.prices) ? json.prices : []
  // Sort defensively in case the upstream payload is shuffled.
  prices.sort((a, b) => a[0] - b[0])
  const series: PricePoint[] = prices.map(([ts, price_usd]) => ({ ts, price_usd }))
  memCache.set(key, { series, fetched_at: Date.now() })
  return series
}

/**
 * Look up the price at `ts` using the closest sample with timestamp
 * <= ts (binary search). Returns null when no such sample exists
 * (engine treats as "unknown" → trade skipped or position zeroed).
 *
 * Critical: NEVER use a sample with ts > target — that is look-ahead
 * bias and would make backtests unrealistically profitable.
 */
export function priceAt(series: PricePoint[], ts: number): number | null {
  if (series.length === 0) return null
  if (ts < series[0].ts) return null
  let lo = 0
  let hi = series.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (series[mid].ts <= ts) lo = mid
    else hi = mid - 1
  }
  return series[lo].price_usd
}
