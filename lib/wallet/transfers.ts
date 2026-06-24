import 'server-only'
import type { BacktestChain } from '../wallet-backtest/types'

// ─── EVM transfer fetcher ────────────────────────────────────────────────
// Uses Alchemy's `alchemy_getAssetTransfers` which returns external
// (native ETH/MATIC) and ERC-20 transfers in one call. We pull both
// directions (to_address and from_address) and merge by hash.
//
// https://docs.alchemy.com/reference/alchemy-getassettransfers

const ALCHEMY_NETWORKS: Partial<Record<BacktestChain, string>> = {
  ethereum: 'eth-mainnet',
  polygon: 'polygon-mainnet',
}

// Stable / quote tokens — used by the engine to decide BUY vs SELL on
// EVM swaps. Lower-cased contract addresses on each supported chain.
export const QUOTE_CONTRACTS: Record<BacktestChain, Set<string>> = {
  ethereum: new Set([
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH (treat as native)
    '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
  ]),
  polygon: new Set([
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC native
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
  ]),
  solana: new Set(),
}

export interface RawEvmTransfer {
  ts: string             // ISO
  block: number
  hash: string
  from: string
  to: string
  // For ERC-20: contract address (lowercased) + decimals + symbol.
  // For native: contract = null.
  contract: string | null
  symbol: string | null
  decimals: number
  // Decoded amount (already scaled by decimals).
  amount: number
  // Direction relative to the queried wallet: did the wallet send or receive?
  direction: 'in' | 'out'
}

function rpcUrl(chain: BacktestChain): string | null {
  const net = ALCHEMY_NETWORKS[chain]
  const key = process.env.ALCHEMY_API_KEY
  if (!net || !key) return null
  return `https://${net}.g.alchemy.com/v2/${key}`
}

// ─── Rate-limit aware retry ──────────────────────────────────────────────
// Alchemy's shared / free tiers answer with HTTP 429 (and occasionally a
// 200 whose body carries a "capacity exceeded" error) when the per-second
// compute budget is blown. The previous fetcher threw on the very first
// 429, which bubbled up as a hard 500 for the entire backtest — the single
// biggest cause of "the backtest failed" reports. We now retry with
// exponential backoff (honoring Retry-After) and tag the terminal error so
// the API layer can answer with a friendly, retryable 429 instead of a 500.
export class UpstreamRateLimitError extends Error {
  readonly isRateLimit = true
  retryAfterSec?: number
  constructor(message: string, retryAfterSec?: number) {
    super(message)
    this.name = 'UpstreamRateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

export function isRateLimitError(e: unknown): e is UpstreamRateLimitError {
  return !!e && typeof e === 'object' && (e as { isRateLimit?: boolean }).isRateLimit === true
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const RATE_LIMIT_RE = /rate|limit|throughput|capacity|exceeded|too many/i
// 0.6s, 1.2s, 2.4s, 4.8s, capped at 6s.
const backoffMs = (attempt: number) => Math.min(600 * 2 ** attempt, 6000)

interface AlchemyTransfer {
  blockNum: string
  uniqueId: string
  hash: string
  from: string
  to: string
  value: number | null
  asset: string | null
  category: string
  rawContract?: { address?: string | null; decimal?: string | null; value?: string | null }
  metadata?: { blockTimestamp?: string }
}

async function fetchPage(
  url: string,
  address: string,
  direction: 'in' | 'out',
  pageKey: string | null,
  fromBlockHex: string,
  toBlockHex: string
): Promise<{ transfers: AlchemyTransfer[]; pageKey: string | null }> {
  const params: any = {
    fromBlock: fromBlockHex,
    toBlock: toBlockHex,
    category: ['external', 'erc20'],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: '0x3e8', // 1000
    // Newest-first so backtests of recent windows reach the relevant
    // transfers before MAX_PAGES is exhausted. Caller still ts-filters
    // and re-sorts ascending below.
    order: 'desc',
  }
  if (direction === 'in') params.toAddress = address
  else params.fromAddress = address
  if (pageKey) params.pageKey = pageKey

  const body = {
    id: 1,
    jsonrpc: '2.0',
    method: 'alchemy_getAssetTransfers',
    params: [params],
  }

  const MAX_RETRIES = 3
  let lastRateErr: UpstreamRateLimitError | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    } catch (e) {
      // Network blip — retry a few times before giving up.
      if (attempt >= MAX_RETRIES) throw e
      await sleep(backoffMs(attempt))
      continue
    }

    if (res.status === 429 || res.status === 503) {
      const ra = Number(res.headers.get('retry-after'))
      const retryAfterSec = Number.isFinite(ra) && ra > 0 ? ra : undefined
      lastRateErr = new UpstreamRateLimitError(`alchemy ${res.status}`, retryAfterSec)
      if (attempt >= MAX_RETRIES) throw lastRateErr
      await sleep(retryAfterSec ? Math.min(retryAfterSec * 1000, 6000) : backoffMs(attempt))
      continue
    }

    if (!res.ok) throw new Error(`alchemy ${res.status}`)

    const j = await res.json()
    if (j.error) {
      const msg = String(j.error?.message || '')
      // Alchemy occasionally returns 200 with a capacity error in the body.
      if (RATE_LIMIT_RE.test(msg)) {
        lastRateErr = new UpstreamRateLimitError(`alchemy: ${msg}`)
        if (attempt >= MAX_RETRIES) throw lastRateErr
        await sleep(backoffMs(attempt))
        continue
      }
      throw new Error(`alchemy: ${msg || 'unknown error'}`)
    }

    return {
      transfers: j.result?.transfers || [],
      pageKey: j.result?.pageKey || null,
    }
  }

  // Exhausted retries while rate-limited.
  throw lastRateErr || new UpstreamRateLimitError('alchemy 429')
}

function normalize(t: AlchemyTransfer, direction: 'in' | 'out'): RawEvmTransfer | null {
  const ts = t.metadata?.blockTimestamp
  if (!ts) return null
  const block = parseInt(t.blockNum || '0', 16) || 0
  const isNative = t.category === 'external'
  const contract = isNative ? null : (t.rawContract?.address || '').toLowerCase()
  // Alchemy returns `value` already scaled by decimals as a number.
  // Floats lose precision for >15 sig figs, but at backtest granularity
  // (USD-bucketed) the loss is harmless.
  const amount = typeof t.value === 'number' && Number.isFinite(t.value) ? t.value : 0
  if (amount <= 0) return null
  return {
    ts,
    block,
    hash: t.hash,
    from: (t.from || '').toLowerCase(),
    to: (t.to || '').toLowerCase(),
    contract: isNative ? null : contract || null,
    symbol: t.asset || null,
    decimals: parseInt(t.rawContract?.decimal || '18', 16) || 18,
    amount,
    direction,
  }
}

/**
 * Fetch all transfers (native + ERC-20) involving `address` in
 * [fromBlock, toBlock]. Pages through Alchemy until done, in BOTH
 * directions, then deduplicates by (uniqueId hash, contract, direction).
 *
 * Caller is responsible for filtering by timestamp; we filter by block
 * because Alchemy doesn't accept a timestamp range.
 */
export async function getEvmTransfers(
  address: string,
  chain: BacktestChain,
  fromBlock: number = 0,
  toBlock: number | 'latest' = 'latest',
  untilMs?: number
): Promise<RawEvmTransfer[]> {
  const url = rpcUrl(chain)
  if (!url) return []

  const fromHex = '0x' + Math.max(0, fromBlock).toString(16)
  const toHex = toBlock === 'latest' ? 'latest' : '0x' + toBlock.toString(16)
  const lowAddr = address.toLowerCase()

  const out: RawEvmTransfer[] = []
  // Hard cap on pagination so a runaway address can't DoS the lambda.
  const MAX_PAGES = 5

  for (const direction of ['in', 'out'] as const) {
    let pageKey: string | null = null
    for (let i = 0; i < MAX_PAGES; i += 1) {
      const { transfers, pageKey: next } = await fetchPage(
        url,
        lowAddr,
        direction,
        pageKey,
        fromHex,
        toHex
      )
      let pageOldestMs = Infinity
      for (const t of transfers) {
        const norm = normalize(t, direction)
        if (norm) {
          out.push(norm)
          const ms = new Date(norm.ts).getTime()
          if (ms < pageOldestMs) pageOldestMs = ms
        }
      }
      if (!next) break
      // Early stop: pages come back newest-first (order: 'desc'), so once
      // the oldest transfer on this page predates the requested window
      // there is nothing left to gain by paging further — and every extra
      // page is one more chance to trip Alchemy's rate limit.
      if (untilMs != null && Number.isFinite(pageOldestMs) && pageOldestMs < untilMs) break
      pageKey = next
    }
  }

  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}
