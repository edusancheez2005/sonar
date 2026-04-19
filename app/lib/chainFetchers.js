import 'server-only'
import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

// ─── API KEYS ────────────────────────────────────────────────────────────
// TODO: Add ALCHEMY_API_KEY and HELIUS_API_KEY to .env.local. Neither key
// existed when this module was written. Fetchers return [] when their key
// is missing so the page still renders Sonar data.
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || ''

// Ethereum whale addresses receive thousands of scam token airdrops
// (LAIKA, MUSK69420, "Visit xyz.com to claim"...). We allowlist major
// tokens to keep the feed signal-heavy. Allowlist lives here rather
// than in a DB table for speed — expand it as new legit tokens emerge.
const MAJOR_TOKEN_ALLOWLIST = new Set([
  'ETH', 'WETH', 'BTC', 'WBTC', 'SOL', 'USDC', 'USDT', 'DAI',
  'USDS', 'LUSD', 'FRAX',
  'UNI', 'LINK', 'AAVE', 'MKR', 'COMP', 'CRV', 'LDO', 'SNX',
  'MATIC', 'ARB', 'OP', 'BASE',
  'PEPE', 'SHIB', 'DOGE', 'BONK',
  'BLUR', 'ENS', 'CVX', 'FXS', 'RPL',
  'JUP', 'PYTH', 'JTO', 'W', 'WIF',
  'TRUMP',
])

function isAllowedEvmTransfer(rawTransfer) {
  // Native transfers (ETH/MATIC/ARB native/BASE native) always pass.
  if (rawTransfer?.category === 'external') return true
  if (rawTransfer?.category === 'erc20') {
    const sym = String(rawTransfer.asset || '').toUpperCase()
    return MAJOR_TOKEN_ALLOWLIST.has(sym)
  }
  return false
}

// ─── Endpoint maps ───────────────────────────────────────────────────────
const ALCHEMY_BASE = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
  base: 'https://base-mainnet.g.alchemy.com/v2/',
}

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/'
const MEMPOOL_API = 'https://mempool.space/api'

// Default 5 s per fetcher — the figure page still budgets the whole
// batch with Promise.allSettled so one slow chain can't wedge SSR.
const PER_FETCH_TIMEOUT_MS = 5000

// ─── Normalized tx shape ─────────────────────────────────────────────────
// { transaction_hash, from_address, to_address, usd_value, token_symbol,
//   amount_native, timestamp, blockchain, source, classification, reasoning }

function normTx(partial) {
  return {
    transaction_hash: partial.transaction_hash || null,
    from_address: partial.from_address || null,
    to_address: partial.to_address || null,
    usd_value: partial.usd_value ?? null,
    token_symbol: partial.token_symbol || null,
    amount_native: partial.amount_native ?? null,
    timestamp: partial.timestamp || null,
    blockchain: partial.blockchain || null,
    source: partial.source || 'chain_api',
    classification: partial.classification || null,
    reasoning: partial.reasoning || null,
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = PER_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      throw new Error(`${url} → ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ─── Price enrichment (Supabase price_snapshots) ─────────────────────────
// Spec §4 says "token_prices" joining on token_symbol — that table does
// not exist in this project. The closest analogue is price_snapshots
// keyed by `ticker`. We fetch the latest snapshot per ticker.
async function getLatestPricesFor(symbols) {
  const unique = [...new Set((symbols || []).filter(Boolean).map((s) => s.toUpperCase()))]
  if (unique.length === 0) return {}
  const { data, error } = await supabaseAdmin
    .from('price_snapshots')
    .select('ticker, price_usd, timestamp')
    .in('ticker', unique)
    .order('timestamp', { ascending: false })
    .limit(unique.length * 5) // oversample, we keep the first per ticker
  if (error) return {}
  const out = {}
  for (const row of data || []) {
    const t = (row.ticker || '').toUpperCase()
    if (!t) continue
    if (!(t in out)) out[t] = Number(row.price_usd) || null
  }
  return out
}

function applyPricesInPlace(txs, prices) {
  for (const tx of txs) {
    if (tx.usd_value !== null && tx.usd_value !== undefined) continue
    const sym = (tx.token_symbol || '').toUpperCase()
    const price = prices[sym]
    if (!price || tx.amount_native === null || tx.amount_native === undefined) continue
    tx.usd_value = Number((tx.amount_native * price).toFixed(2))
  }
}

// ─── Alchemy (ethereum / polygon / arbitrum / base) ──────────────────────
// alchemy_getAssetTransfers only returns one direction per call, so we
// make two calls (outgoing + incoming) and merge.

async function alchemyCall(chain, address, direction) {
  const base = ALCHEMY_BASE[chain]
  if (!base) return []
  if (!ALCHEMY_API_KEY) return []
  const url = `${base}${ALCHEMY_API_KEY}`
  const params = {
    fromBlock: '0x0',
    toBlock: 'latest',
    category: ['external', 'erc20'],
    maxCount: '0x14', // 20 in hex
    order: 'desc',
    withMetadata: true,
    excludeZeroValue: true,
  }
  if (direction === 'out') params.fromAddress = address
  else params.toAddress = address

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [params],
  }

  const json = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return json?.result?.transfers || []
}

async function doFetchAlchemy(chain, address, limit) {
  if (!ALCHEMY_BASE[chain]) return []
  if (!ALCHEMY_API_KEY) return []

  const [outgoing, incoming] = await Promise.all([
    alchemyCall(chain, address, 'out').catch(() => []),
    alchemyCall(chain, address, 'in').catch(() => []),
  ])

  const merged = [...outgoing, ...incoming]
    // Filter spam/airdrop ERC-20s before normalization so we never
    // even allocate tx objects for LAIKA / MUSK69420 / etc.
    .filter(isAllowedEvmTransfer)
    .map((t) =>
      normTx({
        transaction_hash: t.hash,
        from_address: t.from,
        to_address: t.to,
        usd_value: null, // enriched later via price_snapshots
        token_symbol: t.asset || null,
        // Alchemy's getAssetTransfers returns `value` already decoded to
        // a float (e.g. 1.5 for 1.5 ETH). Do NOT use rawContract.value —
        // that's the raw hex wei string.
        amount_native: t.value !== null && t.value !== undefined ? Number(t.value) : null,
        timestamp: t.metadata?.blockTimestamp || null,
        blockchain: chain,
        source: 'chain_api',
      })
    )
    .filter((t) => t.transaction_hash && t.timestamp)

  // Dedupe by hash (same tx appears in both directions for internal swaps)
  const seen = new Map()
  for (const tx of merged) {
    const prev = seen.get(tx.transaction_hash)
    if (!prev) seen.set(tx.transaction_hash, tx)
  }
  return [...seen.values()]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
}

const _cachedAlchemy = unstable_cache(
  async (chain, address, limit) => doFetchAlchemy(chain, address, limit),
  ['chain-fetch:alchemy'],
  { revalidate: 300 }
)

export async function fetchEthereumTxs(address, limit = 20) {
  return _cachedAlchemy('ethereum', address, limit)
}

export async function fetchAlchemyEvmTxs(chain, address, limit = 20) {
  return _cachedAlchemy(chain, address, limit)
}

// ─── Bitcoin (mempool.space, no key required) ────────────────────────────

async function doFetchBitcoin(address, limit) {
  const url = `${MEMPOOL_API}/address/${encodeURIComponent(address)}/txs`
  let raw
  try {
    raw = await fetchWithTimeout(url)
  } catch {
    return []
  }
  const target = String(address)

  const out = []
  for (const tx of (raw || []).slice(0, limit)) {
    const inAmount = (tx.vout || [])
      .filter((v) => v?.scriptpubkey_address === target)
      .reduce((a, v) => a + Number(v.value || 0), 0)
    const outAmount = (tx.vin || [])
      .filter((v) => v?.prevout?.scriptpubkey_address === target)
      .reduce((a, v) => a + Number(v.prevout?.value || 0), 0)

    const isIncoming = inAmount >= outAmount
    // Net movement relevant to this address, in BTC.
    const amountSat = isIncoming ? inAmount - outAmount : outAmount - inAmount
    const amountBtc = amountSat > 0 ? amountSat / 1e8 : null

    const counterpartyFrom = (tx.vin || [])
      .map((v) => v?.prevout?.scriptpubkey_address)
      .find((a) => a && a !== target) || null
    const counterpartyTo = (tx.vout || [])
      .map((v) => v?.scriptpubkey_address)
      .find((a) => a && a !== target) || null

    const fromAddr = isIncoming ? counterpartyFrom : target
    const toAddr = isIncoming ? target : counterpartyTo

    const ts = tx.status?.block_time
      ? new Date(Number(tx.status.block_time) * 1000).toISOString()
      : null
    if (!tx.txid || !ts) continue

    out.push(
      normTx({
        transaction_hash: tx.txid,
        from_address: fromAddr,
        to_address: toAddr,
        token_symbol: 'BTC',
        amount_native: amountBtc,
        timestamp: ts,
        blockchain: 'bitcoin',
        source: 'chain_api',
      })
    )
  }
  return out
}

const _cachedBitcoin = unstable_cache(
  async (address, limit) => doFetchBitcoin(address, limit),
  ['chain-fetch:bitcoin'],
  { revalidate: 300 }
)

export async function fetchBitcoinTxs(address, limit = 20) {
  return _cachedBitcoin(address, limit)
}

// ─── Solana (Helius RPC, batched) ────────────────────────────────────────

async function doFetchSolana(address, limit) {
  if (!HELIUS_API_KEY) return []
  const rpcUrl = `${HELIUS_RPC}?api-key=${HELIUS_API_KEY}`

  // Step 1: getSignaturesForAddress
  let sigs
  try {
    const sigResp = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit }],
      }),
    })
    sigs = sigResp?.result || []
  } catch {
    return []
  }
  if (sigs.length === 0) return []

  // Step 2: batched getTransaction for each signature
  const batch = sigs.map((s, i) => ({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'getTransaction',
    params: [
      s.signature,
      {
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
      },
    ],
  }))

  let txResults
  try {
    txResults = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
  } catch {
    return []
  }

  const out = []
  for (const item of Array.isArray(txResults) ? txResults : []) {
    const tx = item?.result
    if (!tx) continue

    const sigEntry = sigs.find((s) => s.signature === tx.transaction?.signatures?.[0])
    const blockTime = tx.blockTime || sigEntry?.blockTime
    if (!blockTime) continue

    const keys = tx.transaction?.message?.accountKeys || []
    const signer = typeof keys[0] === 'string' ? keys[0] : keys[0]?.pubkey || null
    const counterparty =
      (typeof keys[1] === 'string' ? keys[1] : keys[1]?.pubkey) || null

    const isSigner = signer === address
    const fromAddr = isSigner ? address : signer
    const toAddr = isSigner ? counterparty : address

    // Native SOL delta on the address's account (lamports → SOL).
    const idx = keys.findIndex((k) =>
      (typeof k === 'string' ? k : k?.pubkey) === address
    )
    let amountSol = null
    if (idx >= 0 && tx.meta?.preBalances && tx.meta?.postBalances) {
      const pre = Number(tx.meta.preBalances[idx] || 0)
      const post = Number(tx.meta.postBalances[idx] || 0)
      const delta = Math.abs(post - pre)
      if (delta > 0) amountSol = delta / 1e9
    }

    out.push(
      normTx({
        transaction_hash: tx.transaction?.signatures?.[0] || sigEntry?.signature,
        from_address: fromAddr,
        to_address: toAddr,
        token_symbol: 'SOL',
        amount_native: amountSol,
        timestamp: new Date(blockTime * 1000).toISOString(),
        blockchain: 'solana',
        source: 'chain_api',
      })
    )
  }

  return out
    .filter((t) => t.transaction_hash)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
}

const _cachedSolana = unstable_cache(
  async (address, limit) => doFetchSolana(address, limit),
  ['chain-fetch:solana'],
  { revalidate: 300 }
)

export async function fetchSolanaTxs(address, limit = 20) {
  return _cachedSolana(address, limit)
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

export async function fetchChainTxs({ chain, address, limit = 20 }) {
  if (!chain || !address) return []
  const key = String(chain).toLowerCase()
  switch (key) {
    case 'ethereum':
    case 'polygon':
    case 'arbitrum':
    case 'base':
      return fetchAlchemyEvmTxs(key, address, limit)
    case 'bitcoin':
      return fetchBitcoinTxs(address, limit)
    case 'solana':
      return fetchSolanaTxs(address, limit)
    default:
      // XRP explicitly out of V1 scope; other chains fall through silently.
      return []
  }
}

// ─── Batch helper for /figure/[slug] ─────────────────────────────────────
// Fetches every curated address in parallel with a shared 5 s budget.
// Each individual fetcher also has PER_FETCH_TIMEOUT_MS as a safety net.

export async function fetchChainTxsForAddresses(addresses, { limit = 20, budgetMs = 5000 } = {}) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return { txs: [], timedOut: false, errors: 0 }
  }

  const tasks = addresses.map((a) =>
    fetchChainTxs({ chain: a.chain, address: a.address, limit })
  )

  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve('__timeout__'), budgetMs)
  )

  const settled = await Promise.race([
    Promise.allSettled(tasks),
    timeout,
  ])

  let timedOut = false
  let results
  if (settled === '__timeout__') {
    timedOut = true
    // Drain each task with a near-zero race to capture whatever's already
    // resolved without blocking further.
    results = await Promise.all(
      tasks.map((p) =>
        Promise.race([
          p.then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason })),
          new Promise((resolve) =>
            setTimeout(() => resolve({ status: 'rejected', reason: 'budget' }), 50)
          ),
        ])
      )
    )
  } else {
    results = settled
  }

  let errors = 0
  const txs = []
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      txs.push(...r.value)
    } else {
      errors += 1
    }
  }

  // Enrich with USD prices once for the full batch (one Supabase call).
  const prices = await getLatestPricesFor(txs.map((t) => t.token_symbol))
  applyPricesInPlace(txs, prices)

  // Final sort + dedupe across addresses (same tx can involve two
  // curated addresses, e.g. a Sun → Sun-2 internal transfer).
  const byHash = new Map()
  for (const tx of txs) {
    if (!tx.transaction_hash) continue
    if (!byHash.has(tx.transaction_hash)) byHash.set(tx.transaction_hash, tx)
  }

  return {
    txs: [...byHash.values()].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    ),
    timedOut,
    errors,
  }
}
