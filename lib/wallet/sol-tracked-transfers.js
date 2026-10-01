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
export async function getSolanaTrackedTransfers(address, opts = {}) {
  const key = process.env.HELIUS_API_KEY
  let raw = null
  let heliusError = null
  if (key) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12_000)
    try {
      raw = await fetchHelius(address, key, ctrl.signal)
    } catch (e) {
      heliusError = e
    } finally {
      clearTimeout(t)
    }
  } else {
    heliusError = new Error('HELIUS_API_KEY not set')
  }

  // 2026-10-01: Helius free quota ran out ("helius 429: max usage reached"
  // on 135 of 154 Solana poll states) and the whole Solana feed went dark
  // (Frontier page empty). On quota/key problems fall back to plain Solana
  // JSON-RPC (Alchemy's endpoint when ALCHEMY_API_KEY is set, else the
  // public mainnet RPC) and reconstruct transfers from balance deltas.
  if (heliusError) {
    const msg = String(heliusError?.message || heliusError)
    if (/429|max usage|quota|not set|401|403/i.test(msg)) {
      const rows = await getRpcTransfers(address, opts)
      rows.source = 'solana-rpc'
      rows.fallbackReason = msg.slice(0, 80)
      return rows
    }
    throw heliusError
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

  out.source = 'helius'
  return out
}

// ── JSON-RPC fallback ───────────────────────────────────────────────────────
const PUBLIC_SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
const RPC_SIG_LIMIT = 50
const RPC_MAX_TX_PER_ADDRESS = 12
const RPC_CONCURRENCY = 4
const RPC_DEFAULT_LOOKBACK_S = 6 * 3600

function rpcUrl() {
  const key = process.env.ALCHEMY_API_KEY
  return key ? `https://solana-mainnet.g.alchemy.com/v2/${key}` : PUBLIC_SOLANA_RPC
}

async function rpcCall(url, method, params, timeoutMs = 10_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`solana-rpc ${res.status}`)
    const json = await res.json()
    if (json?.error) throw new Error(`solana-rpc ${json.error.code || ''}: ${String(json.error.message || '').slice(0, 100)}`)
    return json?.result
  } finally {
    clearTimeout(t)
  }
}

/**
 * Reconstruct the tracked address's own transfers from a transaction's
 * balance deltas: native SOL via pre/postBalances (fee-adjusted when the
 * address paid the fee), SPL via pre/postTokenBalances where owner = address.
 * Counterparties are not resolvable this way, so from/to carry the address
 * on its own side and '' on the other.
 */
function rowsFromParsedTx(address, sig, tx) {
  const rows = []
  const meta = tx?.meta
  const msg = tx?.transaction?.message
  if (!meta || !msg) return rows
  const slot = Number(tx.slot || 0)
  const blockTime = Number(tx.blockTime || 0)
  if (!blockTime) return rows
  const tsIso = new Date(blockTime * 1000).toISOString()
  const keys = (msg.accountKeys || []).map((k) => (typeof k === 'string' ? k : k?.pubkey))
  const idx = keys.indexOf(address)
  if (idx >= 0 && Array.isArray(meta.preBalances) && Array.isArray(meta.postBalances)) {
    let delta = Number(meta.postBalances[idx] || 0) - Number(meta.preBalances[idx] || 0)
    if (idx === 0) delta += Number(meta.fee || 0) // fee payer: ignore the fee itself
    if (Math.abs(delta) >= 1_000_000) { // ≥ 0.001 SOL — skip rent/fee dust
      const isOut = delta < 0
      rows.push({ ts: tsIso, block: slot, hash: sig, from: isOut ? address : '', to: isOut ? '' : address, contract: '', symbol: 'SOL', amount: Math.abs(delta) / 1e9, direction: isOut ? 'out' : 'in' })
    }
  }
  const pre = new Map(); const post = new Map()
  for (const b of Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : []) {
    if (b?.owner === address && b.mint) pre.set(b.mint, Number(b.uiTokenAmount?.uiAmount || 0))
  }
  for (const b of Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : []) {
    if (b?.owner === address && b.mint) post.set(b.mint, Number(b.uiTokenAmount?.uiAmount || 0))
  }
  for (const mint of new Set([...pre.keys(), ...post.keys()])) {
    const delta = (post.get(mint) || 0) - (pre.get(mint) || 0)
    if (!Number.isFinite(delta) || delta === 0) continue
    const isOut = delta < 0
    const isNative = mint === WRAPPED_SOL_MINT
    rows.push({ ts: tsIso, block: slot, hash: sig, from: isOut ? address : '', to: isOut ? '' : address, contract: isNative ? '' : mint, symbol: symbolFromMint(mint), amount: Math.abs(delta), direction: isOut ? 'out' : 'in' })
  }
  return rows
}

/**
 * @param {string} address
 * @param {{ sinceUnix?: number, budget?: { calls: number, max: number } }} opts
 */
export async function getRpcTransfers(address, opts = {}) {
  const url = rpcUrl()
  const sinceUnix = Number(opts.sinceUnix) || Math.floor(Date.now() / 1000) - RPC_DEFAULT_LOOKBACK_S
  const budget = opts.budget || { calls: 0, max: Number.POSITIVE_INFINITY }
  const sigs = await rpcCall(url, 'getSignaturesForAddress', [address, { limit: RPC_SIG_LIMIT, commitment: 'confirmed' }])
  budget.calls += 1
  const recent = (Array.isArray(sigs) ? sigs : [])
    .filter((s) => s?.signature && !s.err && Number(s.blockTime || 0) >= sinceUnix)
    .slice(0, RPC_MAX_TX_PER_ADDRESS)
  // Fetch transactions in small parallel batches: sequential getTransaction
  // calls (~0.3s each) for 25 txs × 150 addresses blew the cron's budget on
  // the first live run (2026-10-01).
  const out = []
  let rateLimited = false
  for (let i = 0; i < recent.length && !rateLimited; i += RPC_CONCURRENCY) {
    const batch = recent.slice(i, i + RPC_CONCURRENCY).filter(() => budget.calls++ < budget.max)
    if (batch.length === 0) break
    const results = await Promise.all(batch.map(async (s) => {
      try {
        const tx = await rpcCall(url, 'getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
        return tx ? rowsFromParsedTx(address, s.signature, tx) : []
      } catch (e) {
        if (/429/.test(String(e?.message || e))) rateLimited = true
        return []
      }
    }))
    for (const rows of results) out.push(...rows)
  }
  return out
}
