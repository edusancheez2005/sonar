/**
 * /api/cron/poll-tracked-addresses
 *
 * HOURLY: poll the top entity-attributed addresses in
 * tracked_address_universe for new on-chain transfers and persist them
 * to tracked_address_transfers. Powers the live "recent activity" feed
 * on entity pages and the wallet tracker.
 *
 * Tier 2 of the post-Arkham strategy: zero Arkham calls. Uses Alchemy
 * (EVM chains) only — Solana / BTC / Tron / others can be added later.
 *
 * Scope: priority addresses first (companies + protocols + governments),
 * capped at MAX_ADDRESSES per run. Each address gets one Alchemy
 * `getAssetTransfers` round-trip (in + out merged in the helper).
 *
 * Idempotency: uses the unique index on
 * (chain, tx_hash, address, direction, contract) so re-runs upsert.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getEvmTransfers } from '@/lib/wallet/transfers'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min — Vercel pro plan

// Map tracked_address_universe.chain → BacktestChain understood by
// getEvmTransfers. Only EVM chains supported by our existing helper.
const ALCHEMY_CHAIN_MAP = {
  ethereum: 'ethereum',
  polygon: 'polygon',
  // arbitrum_one / base / optimism not yet wired in transfers.ts; can
  // be added by extending ALCHEMY_NETWORKS there.
}

const MAX_ADDRESSES = 200          // top-N per run; bumped later when stable
const FROM_BLOCK_LOOKBACK = 50_000 // ~7 days on Ethereum at 12 s blocks
// Arkham entity_type values actually present in tracked_address_universe
// today: cex, dex, fund, dex-aggregator, cdp, custodian, bridge,
// crosschain-interoperability, blockchain-infra, derivatives. We poll
// all of them — there are no 'person'-typed rows yet so no filter needed.
const PRIORITY_ENTITY_TYPES = [
  'cex', 'dex', 'dex-aggregator', 'fund', 'custodian',
  'cdp', 'bridge', 'crosschain-interoperability', 'blockchain-infra',
  'derivatives', 'company', 'protocol', 'government',
]

/**
 * Fetch the priority address slice. Companies / protocols / governments
 * tend to move size and matter most for the feed; persons (CT
 * personalities) trade rarely and add noise.
 */
async function fetchPriorityAddresses() {
  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('chain, address, arkham_entity_name, arkham_entity_type, arkham_label')
    .in('chain', Object.keys(ALCHEMY_CHAIN_MAP))
    .in('arkham_entity_type', PRIORITY_ENTITY_TYPES)
    .order('arkham_entity_name', { ascending: true })
    .limit(MAX_ADDRESSES)
  if (error) throw new Error(`load addresses: ${error.message}`)
  return data || []
}

async function getLastBlockMap(rows) {
  const out = new Map()
  if (rows.length === 0) return out
  const addrs = rows.map((r) => r.address)
  const { data } = await supabaseAdmin
    .from('tracked_address_poll_state')
    .select('chain, address, last_block')
    .in('address', addrs)
  for (const row of data || []) {
    out.set(`${row.chain}:${row.address}`, row.last_block || 0)
  }
  return out
}

async function pollAddress(row, lastBlock) {
  const backtestChain = ALCHEMY_CHAIN_MAP[row.chain]
  if (!backtestChain) return { rows: 0, maxBlock: lastBlock, error: 'unsupported_chain' }

  // Always re-scan the trailing window so any reorg or missed page is
  // caught next run. The unique index handles dedupe.
  const fromBlock = Math.max(0, (lastBlock || 0) - 1000)

  let transfers = []
  try {
    transfers = await getEvmTransfers(row.address, backtestChain, fromBlock || 0, 'latest')
  } catch (err) {
    return { rows: 0, maxBlock: lastBlock, error: String(err?.message || err).slice(0, 200) }
  }
  if (!transfers || transfers.length === 0) return { rows: 0, maxBlock: lastBlock, error: null }

  const inserts = transfers.map((t) => ({
    chain: row.chain,
    tx_hash: t.hash,
    address: row.address,
    direction: t.direction,
    contract: t.contract || '',
    block_number: t.block,
    timestamp: t.ts,
    counterparty: t.direction === 'in' ? t.from : t.to,
    token_symbol: t.symbol,
    amount: Number.isFinite(t.amount) ? t.amount : null,
    amount_usd: null, // best-effort enrichment can be added later
    arkham_entity_name: row.arkham_entity_name,
    arkham_entity_type: row.arkham_entity_type,
    arkham_label: row.arkham_label,
    source: 'alchemy',
  }))

  // ON CONFLICT requires a real constraint name; we created a UNIQUE
  // INDEX so use ignoreDuplicates (PostgREST `Prefer: resolution=ignore-duplicates`).
  const { error } = await supabaseAdmin
    .from('tracked_address_transfers')
    .upsert(inserts, {
      onConflict: 'chain,tx_hash,address,direction,contract',
      ignoreDuplicates: true,
    })
  if (error) {
    return { rows: 0, maxBlock: lastBlock, error: error.message.slice(0, 200) }
  }

  const maxBlock = transfers.reduce((m, t) => (t.block > m ? t.block : m), lastBlock || 0)
  return { rows: inserts.length, maxBlock, error: null }
}

async function updatePollState(state) {
  if (state.length === 0) return
  await supabaseAdmin
    .from('tracked_address_poll_state')
    .upsert(state, { onConflict: 'chain,address' })
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const t0 = Date.now()
  let addresses = []
  try {
    addresses = await fetchPriorityAddresses()
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }

  const lastBlocks = await getLastBlockMap(addresses)
  let totalRows = 0
  let ok = 0
  let errs = 0
  const stateUpdates = []

  // Conservative concurrency: Alchemy free tier is ~330 CU/s.
  // getAssetTransfers ≈ 150 CU. Two calls per address (in + out) inside
  // the helper. So sustained ~1 address/s keeps us safe.
  const CONCURRENCY = 3
  for (let i = 0; i < addresses.length; i += CONCURRENCY) {
    const batch = addresses.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((row) => {
        const key = `${row.chain}:${row.address}`
        return pollAddress(row, lastBlocks.get(key) || 0)
      })
    )
    results.forEach((res, idx) => {
      const row = batch[idx]
      if (res.error) errs++
      else ok++
      totalRows += res.rows
      stateUpdates.push({
        chain: row.chain,
        address: row.address,
        last_block: res.maxBlock,
        last_polled: new Date().toISOString(),
        last_error: res.error,
      })
    })
  }

  await updatePollState(stateUpdates)

  return NextResponse.json({
    ok: true,
    addresses_polled: addresses.length,
    addresses_ok: ok,
    addresses_err: errs,
    transfers_inserted_or_seen: totalRows,
    elapsed_ms: Date.now() - t0,
  })
}
