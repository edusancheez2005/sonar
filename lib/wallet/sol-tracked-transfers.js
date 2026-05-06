/**
 * Solana transfer poller for the tracked-address cron.
 *
 * Sibling to lib/wallet/transfers.ts (EVM). Returns the same shape as
 * getEvmTransfers so the cron can persist rows uniformly into
 * tracked_address_transfers.
 *
 * Uses Helius's enhanced parsed-transactions endpoint:
 *   GET /v0/addresses/{address}/transactions?type=TRANSFER
 * which gives us nativeTransfers + tokenTransfers already decoded
 * (no decimals math, no SPL token-account chasing). Free tier accepts
 * 100 tx pages; we ask for that and let the unique index dedupe on the
 * (chain, tx_hash, address, direction, contract) PK.
 *
 * Two design notes:
 *  - We DO NOT use the `before=` cursor. The tracked-address cron walks
 *    the *trailing window* every run, and the unique index makes
 *    duplicate inserts cheap. So a single 100-row slice is enough.
 *  - We filter for transfers where the queried `address` actually moved
 *    value (either as fromUserAccount or toUserAccount) — Helius returns
 *    a tx whenever the address signed it, even if the transfer leg was
 *    between two other accounts.
 */

const HELIUS_API_BASE = 'https://api.helius.xyz/v0'
const PAGE_LIMIT = 100

// Wrapped SOL mint shows up in some token-transfer rows; treat it as
// native SOL so the contract column stays consistent ('' for native).
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

function symbolFromMint(mint) {
  // We don't have a global mint→symbol map server-side here. Helius's
  // tokenTransfers don't carry the symbol. Persist the mint as the
  // symbol fallback so the UI can resolve later (the existing dashboard
  // already short-truncates unknown symbols). Native SOL is special.
  if (!mint || mint === WRAPPED_SOL_MINT) return 'SOL'
  return mint
}

async function fetchHelius(address, key, signal) {
  const url = `${HELIUS_API_BASE}/addresses/${encodeURIComponent(address)}/transactions?api-key=${key}&limit=${PAGE_LIMIT}`
  const res = await fetch(url, { method: 'GET', signal, cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`helius ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`)
  }
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

/**
 * @param {string} address  base58 Solana account
 * @returns {Promise<Array<{ts:string,block:number,hash:string,from:string,to:string,contract:string,symbol:string,amount:number,direction:'in'|'out'}>>}
 */
export async function getSolanaTrackedTransfers(address) {
  const key = process.env.HELIUS_API_KEY
  if (!key) throw new Error('HELIUS_API_KEY not set')

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  let raw
  try {
    raw = await fetchHelius(address, key, ctrl.signal)
  } finally {
    clearTimeout(t)
  }

  const out = []
  for (const tx of raw) {
    const sig = tx?.signature
    const slot = Number(tx?.slot || 0)
    const blockTime = Number(tx?.timestamp || 0)
    if (!sig || !blockTime) continue
    const tsIso = new Date(blockTime * 1000).toISOString()

    // 1. Native SOL transfers
    for (const n of Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : []) {
      const lamports = Number(n.amount || 0)
      if (!lamports) continue
      const isOut = n.fromUserAccount === address
      const isIn = n.toUserAccount === address
      if (!isOut && !isIn) continue
      out.push({
        ts: tsIso,
        block: slot,
        hash: sig,
        from: n.fromUserAccount || '',
        to: n.toUserAccount || '',
        contract: '',
        symbol: 'SOL',
        amount: lamports / 1e9,
        direction: isOut ? 'out' : 'in',
      })
    }

    // 2. SPL token transfers
    for (const tt of Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : []) {
      const isOut = tt.fromUserAccount === address
      const isIn = tt.toUserAccount === address
      if (!isOut && !isIn) continue
      // Helius gives `tokenAmount` already decimal-scaled.
      const amount = Number(tt.tokenAmount || 0)
      if (!Number.isFinite(amount) || amount === 0) continue
      const mint = tt.mint || ''
      const isNative = mint === WRAPPED_SOL_MINT
      out.push({
        ts: tsIso,
        block: slot,
        hash: sig,
        from: tt.fromUserAccount || '',
        to: tt.toUserAccount || '',
        contract: isNative ? '' : mint,
        symbol: symbolFromMint(mint),
        amount,
        direction: isOut ? 'out' : 'in',
      })
    }
  }

  return out
}
