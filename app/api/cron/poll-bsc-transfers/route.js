/**
 * /api/cron/poll-bsc-transfers
 *
 * HOURLY: sweep BSC for BEP-20 transfers touching ANY tracked priority
 * address and persist them to tracked_address_transfers (same table and
 * dedupe key as poll-tracked-addresses).
 *
 * Why a separate cron with a different algorithm: no provider we have
 * covers BSC per-address — Alchemy's plan has no bnb-mainnet (403),
 * Etherscan's free tier rejects chainid 56 ("upgrade your plan"), and
 * keyless public RPCs cap eth_getLogs at ~50 blocks. But getLogs accepts
 * an ARRAY of topic values (OR semantics), so ONE call per ~48-block
 * chunk watches all ~220 tracked BSC addresses simultaneously: ~100
 * chunks × 2 directions ≈ 200 keyless calls cover a full hour of chain.
 * (Verified 2026-07-22 on 1rpc.io/bnb: 254 matched transfers in one
 * 48-block call.)
 *
 * Limitations by design:
 *  - BEP-20 only. Native BNB transfers don't emit logs and would need
 *    per-block tx scans; skipped until a real BSC provider exists.
 *  - Timestamps are anchored per chunk (one getBlockByNumber per chunk)
 *    and interpolated at 0.75s/block inside it — accurate to ±40s.
 *
 * Cursor: app_cache key 'bsc_sweep_last_block'. Lossless across runs —
 * a deadline-cut run resumes from the last completed chunk next hour.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getTokenInfoByContract } from '@/lib/coingecko/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CURSOR_KEY = 'bsc_sweep_last_block'
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const CHUNK_BLOCKS = 48        // 1rpc caps getLogs at 50 blocks
const MAX_LOOKBACK = 6000      // ~75 min at 0.75s — cap catch-up after downtime
const AVG_BLOCK_MS = 750
const TIME_BUDGET_MS = 240_000 // return partial progress well inside maxDuration

// Keyless public endpoints, tried in order per call. Cloudflare fronts some
// of them and rejects requests without a browser-ish UA (same lesson as the
// Arkham harvester).
const RPC_ENDPOINTS = [
  process.env.BSC_RPC_URL,
  'https://1rpc.io/bnb',
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
].filter(Boolean)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

async function rpcCall(method, params) {
  let lastErr = null
  for (const url of RPC_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': UA },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        cache: 'no-store',
      })
      if (!res.ok) { lastErr = new Error(`rpc ${res.status} @ ${url}`); continue }
      const j = await res.json()
      if (j.error) { lastErr = new Error(`rpc: ${String(j.error.message || '').slice(0, 120)} @ ${url}`); continue }
      return j.result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('rpc: all endpoints failed')
}

// Token metadata (decimals/symbol) via eth_call, cached for the lambda's
// lifetime — contracts never change these. null = looked up and undecodable.
const TOKEN_META_CACHE = new Map()

function decodeSymbol(hex) {
  if (!hex || hex === '0x') return null
  const raw = hex.slice(2)
  try {
    // ABI string: [offset][length][bytes...]
    if (raw.length > 128) {
      const len = parseInt(raw.slice(64, 128), 16)
      if (len > 0 && len <= 32) {
        const bytes = raw.slice(128, 128 + len * 2)
        return Buffer.from(bytes, 'hex').toString('utf8').replace(/[^\x20-\x7e]/g, '') || null
      }
    }
    // bytes32 legacy tokens
    return Buffer.from(raw.slice(0, 64), 'hex').toString('utf8').replace(/\0|[^\x20-\x7e]/g, '') || null
  } catch {
    return null
  }
}

async function tokenMeta(contract, budget) {
  if (TOKEN_META_CACHE.has(contract)) return TOKEN_META_CACHE.get(contract)
  if (budget.metaLookups >= budget.maxMeta) return null // retry next run
  budget.metaLookups += 1
  let meta = null
  try {
    const [dec, sym] = await Promise.all([
      rpcCall('eth_call', [{ to: contract, data: '0x313ce567' }, 'latest']), // decimals()
      rpcCall('eth_call', [{ to: contract, data: '0x95d89b41' }, 'latest']), // symbol()
    ])
    const decimals = dec && dec !== '0x' ? parseInt(dec, 16) : null
    meta = decimals != null && decimals >= 0 && decimals <= 36
      ? { decimals, symbol: decodeSymbol(sym) }
      : null
  } catch {
    meta = null
  }
  TOKEN_META_CACHE.set(contract, meta)
  return meta
}

async function loadTrackedBsc() {
  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('address, arkham_entity_name, arkham_entity_type, arkham_label')
    .eq('chain', 'bsc')
    .limit(2000)
  if (error) throw new Error(`load addresses: ${error.message}`)
  const byLower = new Map()
  for (const row of data || []) byLower.set(row.address.toLowerCase(), row)
  return byLower
}

async function readCursor() {
  const { data } = await supabaseAdmin
    .from('app_cache')
    .select('value')
    .eq('key', CURSOR_KEY)
    .limit(1)
  const v = Array.isArray(data) ? data[0]?.value : null
  const n = Number(v?.last_block)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function writeCursor(lastBlock) {
  await supabaseAdmin
    .from('app_cache')
    .upsert(
      { key: CURSOR_KEY, value: { last_block: lastBlock }, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
}

const pad = (addr) => '0x' + '0'.repeat(24) + addr.slice(2).toLowerCase()

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const t0 = Date.now()
  let tracked
  try {
    tracked = await loadTrackedBsc()
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
  if (tracked.size === 0) return NextResponse.json({ ok: true, note: 'no bsc addresses' })
  const padList = [...tracked.keys()].map(pad)

  let head
  try {
    head = parseInt(await rpcCall('eth_blockNumber', []), 16)
  } catch (err) {
    return NextResponse.json({ error: `head: ${String(err?.message || err)}` }, { status: 502 })
  }
  const cursor = await readCursor()
  let from = cursor ? cursor + 1 : head - MAX_LOOKBACK
  if (from < head - MAX_LOOKBACK) from = head - MAX_LOOKBACK

  let inserted = 0
  let matchedLogs = 0
  let chunksDone = 0
  let lastCompleted = from - 1
  const errorCounts = new Map()
  const budget = { metaLookups: 0, maxMeta: 40, cg: 0, maxCg: 10, cgCache: new Map() }

  while (lastCompleted < head && Date.now() - t0 < TIME_BUDGET_MS) {
    const chunkFrom = lastCompleted + 1
    const chunkTo = Math.min(chunkFrom + CHUNK_BLOCKS - 1, head)
    try {
      const [inLogs, outLogs, anchor] = await Promise.all([
        rpcCall('eth_getLogs', [{ fromBlock: '0x' + chunkFrom.toString(16), toBlock: '0x' + chunkTo.toString(16), topics: [TRANSFER_TOPIC, null, padList] }]),
        rpcCall('eth_getLogs', [{ fromBlock: '0x' + chunkFrom.toString(16), toBlock: '0x' + chunkTo.toString(16), topics: [TRANSFER_TOPIC, padList] }]),
        rpcCall('eth_getBlockByNumber', ['0x' + chunkTo.toString(16), false]),
      ])
      const anchorTsMs = (parseInt(anchor?.timestamp ?? '0x0', 16) || Math.floor(Date.now() / 1000)) * 1000

      const rows = []
      for (const [logs, direction] of [[inLogs, 'in'], [outLogs, 'out']]) {
        for (const l of logs || []) {
          if (!Array.isArray(l.topics) || l.topics.length < 3) continue
          const fromAddr = '0x' + l.topics[1].slice(-40)
          const toAddr = '0x' + l.topics[2].slice(-40)
          const self = direction === 'in' ? toAddr : fromAddr
          const row = tracked.get(self)
          if (!row) continue
          matchedLogs += 1
          const contract = (l.address || '').toLowerCase()
          const meta = await tokenMeta(contract, budget)
          const rawVal = Number(BigInt(l.data === '0x' ? '0x0' : l.data))
          const amount = meta && Number.isFinite(rawVal) && rawVal > 0
            ? rawVal / 10 ** meta.decimals
            : null
          const block = parseInt(l.blockNumber, 16) || chunkTo
          rows.push({
            chain: 'bsc',
            tx_hash: l.transactionHash,
            address: row.address,
            direction,
            contract,
            block_number: block,
            timestamp: new Date(anchorTsMs - (chunkTo - block) * AVG_BLOCK_MS).toISOString(),
            counterparty: direction === 'in' ? fromAddr : toAddr,
            token_symbol: meta?.symbol ? meta.symbol.toUpperCase().slice(0, 20) : null,
            amount,
            amount_usd: null,
            arkham_entity_name: row.arkham_entity_name,
            arkham_entity_type: row.arkham_entity_type,
            arkham_label: row.arkham_label,
            source: 'bsc-logs',
          })
        }
      }

      // Best-effort USD via CoinGecko contract lookup, shared run budget.
      const byContract = new Map()
      for (const r of rows) {
        if (r.amount == null) continue
        if (!byContract.has(r.contract)) byContract.set(r.contract, [])
        byContract.get(r.contract).push(r)
      }
      for (const [contract, list] of byContract) {
        let price = budget.cgCache.get(contract)
        if (price === undefined) {
          if (budget.cg >= budget.maxCg) continue
          budget.cg += 1
          try {
            const info = await getTokenInfoByContract('binance-smart-chain', contract)
            price = info?.market_data?.current_price?.usd ?? null
          } catch {
            price = null
          }
          budget.cgCache.set(contract, price)
        }
        if (price == null) continue
        for (const r of list) r.amount_usd = r.amount * price
      }

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from('tracked_address_transfers')
          .upsert(rows, {
            onConflict: 'chain,tx_hash,address,direction,contract',
            ignoreDuplicates: true,
          })
        if (error) throw new Error(`upsert: ${error.message.slice(0, 120)}`)
        inserted += rows.length
      }
      lastCompleted = chunkTo
      chunksDone += 1
    } catch (err) {
      const key = String(err?.message || err).slice(0, 120)
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1)
      // Persistent failure on one chunk must not wedge the cursor forever;
      // after 3 strikes skip the chunk (dedupe makes a later re-sweep safe).
      if ((errorCounts.get(key) || 0) >= 3 && chunksDone === 0) break
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  if (lastCompleted >= from) await writeCursor(lastCompleted)

  return NextResponse.json({
    ok: true,
    head,
    swept: { from, to: lastCompleted },
    blocks_behind: head - lastCompleted,
    chunks: chunksDone,
    matched_logs: matchedLogs,
    rows_upserted_or_seen: inserted,
    meta_lookups: budget.metaLookups,
    cg_lookups: budget.cg,
    error_breakdown: Object.fromEntries(
      [...errorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    ),
    elapsed_ms: Date.now() - t0,
  })
}
