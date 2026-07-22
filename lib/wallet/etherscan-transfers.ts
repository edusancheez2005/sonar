import 'server-only'
import type { RawEvmTransfer } from './transfers'

// ─── Etherscan V2 multichain transfer fetcher ────────────────────────────
// Covers chains our Alchemy app can't (BNB Chain: Eduardo's plan has no
// bnb-mainnet — every poll answered 403 on 2026-07-22). One GET per
// tx type returns BOTH directions with symbol/decimals/timestamps
// included, so it's actually fewer round-trips than getAssetTransfers.
//
// https://docs.etherscan.io/etherscan-v2 — free key: 5 req/s, 100k/day.
// The poll cron's ~220 BSC addresses × 2 calls/hour ≈ 11k/day.

const BASE = 'https://api.etherscan.io/v2/api'

// Etherscan V2 chainid registry for the chains we route here.
export const ETHERSCAN_CHAIN_IDS: Record<string, number> = {
  bsc: 56,
}

const NATIVE_SYMBOL: Record<number, string> = {
  56: 'BNB',
}

interface EtherscanTx {
  blockNumber: string
  timeStamp: string // unix seconds
  hash: string
  from: string
  to: string
  value: string
  isError?: string
  contractAddress?: string
  tokenSymbol?: string
  tokenDecimal?: string
}

async function esGet(params: Record<string, string>): Promise<EtherscanTx[]> {
  const key = process.env.ETHERSCAN_API_KEY
  if (!key) throw new Error('etherscan_key_missing')
  const qs = new URLSearchParams({ ...params, apikey: key })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${BASE}?${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`etherscan ${res.status}`)
    const j = await res.json()
    if (Array.isArray(j.result)) return j.result
    // status:"0" covers both "No transactions found" (fine) and real
    // failures (rate limit, bad key) where result is a string message.
    const msg = String(j.result ?? j.message ?? '')
    if (/no transactions found/i.test(msg)) return []
    if (/rate limit/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      continue
    }
    throw new Error(`etherscan: ${msg.slice(0, 120) || 'unknown error'}`)
  }
  throw new Error('etherscan: rate limited')
}

function toTransfer(
  t: EtherscanTx,
  lowAddr: string,
  native: boolean,
  chainId: number
): RawEvmTransfer | null {
  const from = (t.from || '').toLowerCase()
  const to = (t.to || '').toLowerCase()
  const decimals = native ? 18 : parseInt(t.tokenDecimal || '18', 10) || 18
  const raw = Number(t.value)
  if (!Number.isFinite(raw) || raw <= 0) return null
  if (native && t.isError === '1') return null
  const tsMs = (parseInt(t.timeStamp, 10) || 0) * 1000
  if (!tsMs) return null
  return {
    ts: new Date(tsMs).toISOString(),
    block: parseInt(t.blockNumber, 10) || 0,
    hash: t.hash,
    from,
    to,
    contract: native ? null : (t.contractAddress || '').toLowerCase() || null,
    symbol: native ? NATIVE_SYMBOL[chainId] ?? null : t.tokenSymbol || null,
    decimals,
    amount: raw / 10 ** decimals,
    direction: from === lowAddr ? 'out' : 'in',
  }
}

/**
 * Fetch native + token transfers involving `address` since `fromBlock`,
 * newest first, capped at 1000 rows per tx type (plenty for an hourly
 * incremental poll; on a cold address it grabs the most recent 1000).
 */
export async function getEtherscanTransfers(
  address: string,
  chainId: number,
  fromBlock: number = 0
): Promise<RawEvmTransfer[]> {
  const lowAddr = address.toLowerCase()
  const common = {
    chainid: String(chainId),
    module: 'account',
    address,
    startblock: String(Math.max(0, fromBlock)),
    endblock: 'latest',
    page: '1',
    offset: '1000',
    sort: 'desc',
  }
  const [nativeTxs, tokenTxs] = await Promise.all([
    esGet({ ...common, action: 'txlist' }),
    esGet({ ...common, action: 'tokentx' }),
  ])

  const out: RawEvmTransfer[] = []
  for (const t of nativeTxs) {
    const n = toTransfer(t, lowAddr, true, chainId)
    if (n) out.push(n)
  }
  for (const t of tokenTxs) {
    const n = toTransfer(t, lowAddr, false, chainId)
    if (n) out.push(n)
  }
  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}
