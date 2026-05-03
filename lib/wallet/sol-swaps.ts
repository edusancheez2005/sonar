import 'server-only'

// ─── Solana swap fetcher ─────────────────────────────────────────────────
// Uses Helius Enhanced Transactions API. We filter to type === 'SWAP'
// and normalize each into a pair of legs (sold + bought).
//
// https://docs.helius.dev/api-reference/enhanced-transactions-api

export interface RawSolSwap {
  ts: string                   // ISO
  signature: string
  // Token sent away from the wallet (the "sell" leg of the swap).
  sold_mint: string | null     // null for SOL
  sold_amount: number          // ui-amount (already scaled by decimals)
  // Token received by the wallet (the "buy" leg).
  bought_mint: string | null   // null for SOL
  bought_amount: number
}

interface HeliusEnhancedTx {
  signature: string
  timestamp: number             // unix seconds
  type: string
  tokenTransfers?: Array<{
    fromUserAccount?: string
    toUserAccount?: string
    mint: string
    tokenAmount: number         // ui amount
  }>
  nativeTransfers?: Array<{
    fromUserAccount?: string
    toUserAccount?: string
    amount: number              // lamports
  }>
}

const SOL_MINT_PLACEHOLDER = null // we keep null to mean "native SOL"

function buildSwap(tx: HeliusEnhancedTx, owner: string): RawSolSwap | null {
  const ownerLow = owner

  // Token in/out from this wallet.
  const tokenTransfers = tx.tokenTransfers || []
  const sentTokens = tokenTransfers.filter((t) => t.fromUserAccount === ownerLow && t.tokenAmount > 0)
  const recvTokens = tokenTransfers.filter((t) => t.toUserAccount === ownerLow && t.tokenAmount > 0)

  // Native SOL legs (lamports).
  const nativeTransfers = tx.nativeTransfers || []
  const sentSol = nativeTransfers
    .filter((n) => n.fromUserAccount === ownerLow)
    .reduce((s, n) => s + (n.amount || 0), 0)
  const recvSol = nativeTransfers
    .filter((n) => n.toUserAccount === ownerLow)
    .reduce((s, n) => s + (n.amount || 0), 0)

  // Heuristic: a SWAP shows ONE main "sold" leg and ONE "bought" leg
  // from the wallet's perspective. If we see neither, skip.
  let sold_mint: string | null = null
  let sold_amount = 0
  let bought_mint: string | null = null
  let bought_amount = 0

  if (sentTokens.length > 0) {
    // Pick the largest sent token by ui amount.
    const top = sentTokens.slice().sort((a, b) => b.tokenAmount - a.tokenAmount)[0]
    sold_mint = top.mint
    sold_amount = top.tokenAmount
  } else if (sentSol > 0) {
    sold_mint = SOL_MINT_PLACEHOLDER
    sold_amount = sentSol / 1e9
  }

  if (recvTokens.length > 0) {
    const top = recvTokens.slice().sort((a, b) => b.tokenAmount - a.tokenAmount)[0]
    bought_mint = top.mint
    bought_amount = top.tokenAmount
  } else if (recvSol > 0) {
    bought_mint = SOL_MINT_PLACEHOLDER
    bought_amount = recvSol / 1e9
  }

  if (sold_amount === 0 && bought_amount === 0) return null

  return {
    ts: new Date(tx.timestamp * 1000).toISOString(),
    signature: tx.signature,
    sold_mint,
    sold_amount,
    bought_mint,
    bought_amount,
  }
}

/**
 * Fetch SWAP-type enhanced transactions for an address. Helius caps
 * the response at 100 per page; we iterate `before=` until we cross
 * `sinceMs` or hit the page cap.
 */
export async function getSolanaSwaps(
  address: string,
  sinceMs: number,
  pageCap = 5
): Promise<RawSolSwap[]> {
  const key = process.env.HELIUS_API_KEY
  if (!key) return []
  const owner = address

  const out: RawSolSwap[] = []
  let before: string | null = null

  for (let page = 0; page < pageCap; page += 1) {
    const params = new URLSearchParams({ 'api-key': key, type: 'SWAP', limit: '100' })
    if (before) params.set('before', before)
    const url = `https://api.helius.xyz/v0/addresses/${owner}/transactions?${params.toString()}`
    let res: Response
    try {
      res = await fetch(url, { cache: 'no-store' })
    } catch {
      break
    }
    if (!res.ok) break
    const txs: HeliusEnhancedTx[] = await res.json().catch(() => [])
    if (!Array.isArray(txs) || txs.length === 0) break

    let crossedFloor = false
    for (const tx of txs) {
      const tsMs = (tx.timestamp || 0) * 1000
      if (tsMs < sinceMs) {
        crossedFloor = true
        continue
      }
      if (tx.type !== 'SWAP') continue
      const sw = buildSwap(tx, owner)
      if (sw) out.push(sw)
    }

    if (crossedFloor) break
    before = txs[txs.length - 1]?.signature || null
    if (!before) break
  }

  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}
