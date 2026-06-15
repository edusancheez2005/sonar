/**
 * CRON: Refresh the Polymarket activity tape
 * Schedule: every 15 min (see vercel.json)
 *
 * SCOPE — activity tape ONLY. Investigation (June 2026) showed that
 * polymarket_markets / polymarket_whales / polymarket_market_holders are
 * already kept fresh by an existing external sync (they update every few
 * minutes), while polymarket_activity went stale — its newest trade was from
 * 2026-06-12. So this cron deliberately does NOT touch the three healthy
 * tables (writing them would fight the external sync and make whale_count /
 * whale_flow flip-flop). It only tops up the trade tape.
 *
 * Source: public Polymarket Data API (https://data-api.polymarket.com/trades),
 * no auth. The market universe comes from polymarket_markets (the external
 * sync's output) so we follow the same markets the board shows.
 *
 * Append-only: polymarket_activity is an externally-owned table with no
 * conflict key we control (tx_hash repeats across fills, outcome_index is
 * nullable), so we dedupe candidates against existing rows by a natural key
 * and INSERT only genuinely new fills — never upsert/delete.
 *
 * entity_name is resolved LOCALLY from tracked_address_universe (zero Arkham
 * credits; the subscription is cancelled — see lib/arkham/license.ts).
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA = 'https://data-api.polymarket.com'

const ACTIVITY_MARKETS = 40 // pull trades for the top N markets by 24h volume
const TRADES_PER_MARKET = 100
const MIN_TRADE_USD = 5000 // tape floor — only "whale" fills
const EXISTING_LOOKUP_CHUNK = 300
const INSERT_CHUNK = 500
const FETCH_TIMEOUT_MS = 12_000

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Polymarket trade timestamps come back as epoch seconds; coerce to ISO.
function toIso(ts) {
  if (ts == null) return null
  let ms = Number(ts)
  if (!Number.isFinite(ms)) {
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (ms < 1e12) ms *= 1000
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Natural key identifying a single fill — must match the columns we store, so
// re-running the cron over overlapping trade windows never double-inserts.
function naturalKey(r) {
  return `${r.tx_hash}|${r.proxy_wallet}|${r.side || ''}|${r.outcome || ''}|${r.size}`
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const summary = { markets_scanned: 0, trades_seen: 0, candidates: 0, inserted: 0, errors: [] }
  const now = new Date().toISOString()

  // ── 1. Market universe (from the external sync's output) ────────────
  let conditionIds = []
  try {
    const { data, error } = await supabase
      .from('polymarket_markets')
      .select('condition_id')
      .order('volume_24h', { ascending: false, nullsFirst: false })
      .limit(ACTIVITY_MARKETS)
    if (error) throw new Error(error.message)
    conditionIds = (data || []).map((m) => m.condition_id).filter(Boolean)
    summary.markets_scanned = conditionIds.length
  } catch (e) {
    summary.errors.push(`markets_read: ${e?.message || e}`)
    return NextResponse.json({ message: 'Could not read market universe', ...summary }, { status: 502 })
  }

  // ── 2. Pull recent trades per market ────────────────────────────────
  const candidates = new Map() // naturalKey -> row
  for (const conditionId of conditionIds) {
    const data = await fetchJson(
      `${DATA}/trades?market=${conditionId}&limit=${TRADES_PER_MARKET}&takerOnly=false`
    )
    if (!Array.isArray(data)) continue
    for (const t of data) {
      summary.trades_seen++
      const wallet = (t?.proxyWallet || '').trim()
      const txHash = (t?.transactionHash || t?.txHash || '').trim()
      if (!wallet || !txHash) continue
      const price = num(t.price) ?? 0
      const size = num(t.size) ?? 0
      const usd = size * price
      if (usd < MIN_TRADE_USD) continue
      const row = {
        tx_hash: txHash,
        condition_id: conditionId,
        proxy_wallet: wallet,
        entity_name: null, // filled in step 3
        name: (t.name || t.pseudonym || '').trim() || null,
        // Preserve Polymarket's lowercase side ("buy"/"sell") to match the
        // rows the original sync wrote.
        side: (t.side || '').toLowerCase() || null,
        outcome: t.outcome || null,
        outcome_index: Number.isFinite(Number(t.outcomeIndex)) ? Number(t.outcomeIndex) : null,
        usd_value: Math.round(usd),
        price,
        size,
        ts: toIso(t.timestamp ?? t.matchTime ?? t.ts),
        updated_at: now,
      }
      candidates.set(naturalKey(row), row)
    }
  }
  summary.candidates = candidates.size
  if (candidates.size === 0) {
    return NextResponse.json({ message: 'No new whale trades found', ...summary })
  }

  // ── 3. Local entity resolution (zero Arkham credits) ────────────────
  try {
    const wallets = [...new Set([...candidates.values()].map((r) => r.proxy_wallet))]
    const lookup = [...new Set([...wallets, ...wallets.map((w) => w.toLowerCase())])]
    const entityByWallet = new Map()
    for (let i = 0; i < lookup.length; i += 1000) {
      const slice = lookup.slice(i, i + 1000)
      const { data } = await supabase
        .from('tracked_address_universe')
        .select('address, arkham_entity_name')
        .in('address', slice)
      for (const r of data || []) {
        if (r?.arkham_entity_name) {
          entityByWallet.set(r.address, r.arkham_entity_name)
          entityByWallet.set(String(r.address).toLowerCase(), r.arkham_entity_name)
        }
      }
    }
    for (const r of candidates.values()) {
      r.entity_name =
        entityByWallet.get(r.proxy_wallet) || entityByWallet.get(r.proxy_wallet.toLowerCase()) || null
    }
  } catch (e) {
    summary.errors.push(`entity_resolve: ${e?.message || e}`)
  }

  // ── 4. Drop fills already in the table (append-only) ────────────────
  try {
    const txHashes = [...new Set([...candidates.values()].map((r) => r.tx_hash))]
    const existing = new Set()
    for (let i = 0; i < txHashes.length; i += EXISTING_LOOKUP_CHUNK) {
      const slice = txHashes.slice(i, i + EXISTING_LOOKUP_CHUNK)
      const { data, error } = await supabase
        .from('polymarket_activity')
        .select('tx_hash, proxy_wallet, side, outcome, size')
        .in('tx_hash', slice)
      if (error) throw new Error(error.message)
      for (const r of data || []) existing.add(naturalKey(r))
    }
    for (const k of [...candidates.keys()]) {
      if (existing.has(k)) candidates.delete(k)
    }
  } catch (e) {
    // If the existence check fails we abort rather than risk duplicate inserts.
    summary.errors.push(`dedupe: ${e?.message || e}`)
    return NextResponse.json({ message: 'Dedupe failed; skipped insert to avoid duplicates', ...summary }, { status: 502 })
  }

  // ── 5. Insert the genuinely-new fills ───────────────────────────────
  try {
    const rows = [...candidates.values()]
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const slice = rows.slice(i, i + INSERT_CHUNK)
      const { error } = await supabase.from('polymarket_activity').insert(slice)
      if (error) throw new Error(error.message)
      summary.inserted += slice.length
    }
  } catch (e) {
    summary.errors.push(`insert: ${e?.message || e}`)
    return NextResponse.json({ message: 'Insert failed', ...summary }, { status: 502 })
  }

  return NextResponse.json({ message: 'Polymarket activity tape refreshed', ...summary })
}
