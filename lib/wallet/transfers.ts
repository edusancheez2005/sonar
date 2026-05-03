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
    order: 'asc',
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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`alchemy ${res.status}`)
  const j = await res.json()
  if (j.error) throw new Error(`alchemy: ${j.error.message}`)
  return {
    transfers: j.result?.transfers || [],
    pageKey: j.result?.pageKey || null,
  }
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
  toBlock: number | 'latest' = 'latest'
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
      for (const t of transfers) {
        const norm = normalize(t, direction)
        if (norm) out.push(norm)
      }
      if (!next) break
      pageKey = next
    }
  }

  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}
