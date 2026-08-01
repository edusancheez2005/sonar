/**
 * CRON: X Whale Alerts — posts whale activity to @SonarTrackerio.
 *
 * Two post types, checked in priority order each run:
 *   1. FAMOUS MOVE — a curated famous wallet (featured figures + persons/
 *      celebrities/governments from curated_entities) moved ≥$250k in the
 *      last 24h, per the hourly-polled tracked_address_transfers feed.
 *      Links to the /figure/{slug} page. Max one post per entity per day.
 *   2. WHALE MOVE — biggest $5M–$150M transfer from the whale feed
 *      (all_whale_transactions), labeled via tracked_address_universe.
 *      Links to the /token/{SYM} page.
 *
 * Context enrichment on both: dormancy ("first move in N days", from the
 * per-address history in tracked_address_transfers) and Sonar's 7d replay
 * return when the address is in the anon smart-money backtest set.
 *
 * Budget: X_DAILY_POST_BUDGET (default 5 = one per cron slot; pay-per-use
 * billing ~$0.20/link post). ?dry=1 composes without posting.
 *
 * State in app_cache:
 *   x_post_count:<UTC date>    {"count": n}
 *   x_whale_alerts_posted      {"hashes": [...]}   dedupe (last 200)
 *   x_famous_posted:<UTC date> {"slugs": [...]}    per-entity daily dedupe
 *   x_quota_snapshot           last quota headers from POST /2/tweets
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { fetchArkhamLabels, formatArkhamDisplayName } from '@/lib/arkham/address-lookup'
import { postTweet } from '@/lib/x/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

// Known-junk vanity contract whose hourly WBTC "BUYs" are classifier noise
// (see ORCA audit issue #1); ORCA also excludes >$150M single transfers as
// unreliable, so we mirror both filters here.
const JUNK_ADDRESSES = new Set(['0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'])
const MAX_SANE_USD = 150_000_000
const WHALE_LOOKBACK_HOURS = 8
const FAMOUS_LOOKBACK_HOURS = 24
const FAMOUS_CATEGORIES = new Set(['person', 'celebrity', 'government'])
const DORMANCY_MIN_DAYS = 14
const BASE = 'https://www.sonartracker.io'

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}

function utm(path: string, campaign: string): string {
  return `${BASE}${path}?utm_source=x&utm_medium=post&utm_campaign=${campaign}`
}

type WhaleTx = {
  transaction_hash: string
  timestamp: string
  blockchain: string | null
  token_symbol: string | null
  classification: string | null
  usd_value: number | null
  from_address: string | null
  to_address: string | null
}

type TrackedRow = {
  tx_hash: string
  timestamp: string
  chain: string | null
  address: string
  direction: string | null
  counterparty: string | null
  token_symbol: string | null
  amount_usd: number | null
}

type FamousEntity = { slug: string; name: string }

/** "First on-chain move in 34 days." — or null if recent/unknown history. */
async function dormancyLine(address: string | null, beforeIso: string): Promise<string | null> {
  if (!address) return null
  try {
    const { data } = await supabaseAdmin
      .from('tracked_address_transfers')
      .select('timestamp')
      .eq('address', address)
      .lt('timestamp', beforeIso)
      .order('timestamp', { ascending: false })
      .limit(1)
    const prev = data?.[0]?.timestamp
    if (!prev) return null
    const days = Math.floor((new Date(beforeIso).getTime() - new Date(prev).getTime()) / 86_400_000)
    return days >= DORMANCY_MIN_DAYS ? `First on-chain move in ${days} days.` : null
  } catch { return null }
}

/** "Sonar's 7d replay of this wallet: +1.4%." — from the anon backtest set. */
async function pnlLine(...addresses: (string | null)[]): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', 'anon_whale_backtests_7d').maybeSingle()
    const rows: any[] = data?.value?.rows || []
    if (!rows.length) return null
    const wanted = new Set(addresses.filter(Boolean).map(a => String(a).toLowerCase()))
    const hit = rows.find(r => wanted.has(String(r.address || '').toLowerCase()) && r.error == null && r.trades > 0)
    if (!hit || !Number.isFinite(hit.return_pct_7d) || hit.return_pct_7d === 0) return null
    const sign = hit.return_pct_7d > 0 ? '+' : ''
    return `Sonar's 7d replay of this wallet: ${sign}${hit.return_pct_7d.toFixed(1)}%.`
  } catch { return null }
}

/** Famous-wallet scan: biggest fresh move by a curated famous entity. */
async function findFamousMove(minUsd: number, postedHashes: Set<string>, postedSlugs: Set<string>) {
  const { data: entities } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, is_featured, addresses')
  const addrToEntity = new Map<string, FamousEntity>()
  for (const e of entities || []) {
    if (!e.is_featured && !FAMOUS_CATEGORIES.has(e.category)) continue
    if (postedSlugs.has(e.slug)) continue
    for (const a of e.addresses || []) {
      if (a?.address) addrToEntity.set(String(a.address).toLowerCase(), { slug: e.slug, name: e.display_name })
    }
  }
  if (addrToEntity.size === 0) return null

  const since = new Date(Date.now() - FAMOUS_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
  const allAddrs = [...addrToEntity.keys()]
  let best: TrackedRow | null = null
  // Chunked in-lists keep each query on the (address, timestamp) index.
  for (let i = 0; i < allAddrs.length; i += 150) {
    const chunk = allAddrs.slice(i, i + 150)
    // Address column preserves original casing; match both forms.
    const both = [...new Set([...chunk, ...chunk.map(a => a.toLowerCase())])]
    const { data } = await supabaseAdmin
      .from('tracked_address_transfers')
      .select('tx_hash, timestamp, chain, address, direction, counterparty, token_symbol, amount_usd')
      .in('address', both)
      .gte('timestamp', since)
      .gte('amount_usd', minUsd)
      .lte('amount_usd', MAX_SANE_USD)
      .order('amount_usd', { ascending: false })
      .limit(5)
    for (const r of (data || []) as TrackedRow[]) {
      if (postedHashes.has(r.tx_hash)) continue
      if (!r.token_symbol) continue
      if (!best || (r.amount_usd || 0) > (best.amount_usd || 0)) best = r
    }
  }
  if (!best) return null
  const entity = addrToEntity.get(best.address.toLowerCase())
  if (!entity) return null
  return { row: best, entity }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const dry = url.searchParams.get('dry') === '1'
    const minUsd = Number(url.searchParams.get('min')) || Number(process.env.X_ALERT_MIN_USD) || 5_000_000
    const famousMinUsd = Number(process.env.X_FAMOUS_MIN_USD) || 250_000
    // Default 5 = one post per cron slot (pay-per-use billing confirmed
    // 2026-08-01 — no legacy 17/day cap). Override via X_DAILY_POST_BUDGET.
    const budget = Number(process.env.X_DAILY_POST_BUDGET) || 5

    // 1. Daily budget check (UTC day).
    const today = new Date().toISOString().slice(0, 10)
    const countKey = `x_post_count:${today}`
    const { data: countRow } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', countKey).maybeSingle()
    const postedToday = Number(countRow?.value?.count) || 0
    if (!dry && postedToday >= budget) {
      return NextResponse.json({ skipped: 'daily budget reached', postedToday, budget })
    }

    // 2. Dedupe state.
    const { data: dedupeRow } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', 'x_whale_alerts_posted').maybeSingle()
    const postedHashes: string[] = Array.isArray(dedupeRow?.value?.hashes) ? dedupeRow.value.hashes : []
    const postedSet = new Set(postedHashes)
    const famousKey = `x_famous_posted:${today}`
    const { data: famousRow } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', famousKey).maybeSingle()
    const postedSlugs: string[] = Array.isArray(famousRow?.value?.slugs) ? famousRow.value.slugs : []

    // 3. Compose: famous move first, whale move as fallback.
    let text: string | null = null
    let txId: string | null = null
    let famousSlug: string | null = null
    let kind: string = 'whale'

    const famous = await findFamousMove(famousMinUsd, postedSet, new Set(postedSlugs))
    if (famous) {
      kind = 'famous'
      const { row, entity } = famous
      famousSlug = entity.slug
      txId = row.tx_hash
      const usd = Number(row.amount_usd) || 0
      const sym = String(row.token_symbol).toUpperCase()
      const verb = row.direction === 'in' ? 'received' : 'sent'
      const cpLabels = row.counterparty ? await fetchArkhamLabels([row.counterparty]) : new Map()
      const cpName = formatArkhamDisplayName(cpLabels.get(row.counterparty || '') || cpLabels.get((row.counterparty || '').toLowerCase()))
      const cpPart = cpName ? (row.direction === 'in' ? ` from ${cpName}` : ` to ${cpName}`) : ''
      const chain = row.chain ? ` on ${row.chain.charAt(0).toUpperCase()}${row.chain.slice(1)}` : ''
      const dorm = await dormancyLine(row.address, row.timestamp)
      const pnl = dorm ? null : await pnlLine(row.address)
      const context = dorm || pnl
      text =
        `🚨 ${entity.name} just ${verb} ${fmtUsd(usd)} in $${sym}${cpPart}${chain}.` +
        (context ? ` ${context}` : '') +
        `\n\nTrack ${entity.name}'s wallets live → ${utm(`/figure/${entity.slug}`, 'famous_wallets')}`
    } else {
      // Whale-feed fallback (original flow).
      const since = new Date(Date.now() - WHALE_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
      const { data: txs, error: txErr } = await supabaseAdmin
        .from('all_whale_transactions')
        .select('transaction_hash, timestamp, blockchain, token_symbol, classification, usd_value, from_address, to_address')
        .gte('timestamp', since)
        .gte('usd_value', minUsd)
        .lte('usd_value', MAX_SANE_USD)
        .not('token_symbol', 'is', null)
        .order('usd_value', { ascending: false })
        .limit(50)
      if (txErr) {
        return NextResponse.json({ error: txErr.message }, { status: 500 })
      }
      const candidates = ((txs || []) as WhaleTx[]).filter(tx =>
        !postedSet.has(tx.transaction_hash) &&
        !JUNK_ADDRESSES.has((tx.from_address || '').toLowerCase()) &&
        !JUNK_ADDRESSES.has((tx.to_address || '').toLowerCase())
      ).slice(0, 10)
      if (candidates.length === 0) {
        return NextResponse.json({ skipped: 'no qualifying transfer in window', minUsd, window_hours: WHALE_LOOKBACK_HOURS })
      }
      // Prefer the biggest transfer with at least one labeled side.
      const labels = await fetchArkhamLabels(
        candidates.flatMap(tx => [tx.from_address, tx.to_address]).filter(Boolean) as string[]
      )
      const label = (addr: string | null) =>
        addr ? (labels.get(addr) || labels.get(addr.toLowerCase())) : undefined
      const pick =
        candidates.find(tx => label(tx.from_address) || label(tx.to_address)) ||
        candidates[0]
      txId = pick.transaction_hash
      const fromName = formatArkhamDisplayName(label(pick.from_address)) || 'unknown wallet'
      const toName = formatArkhamDisplayName(label(pick.to_address)) || 'unknown wallet'
      const sym = String(pick.token_symbol).toUpperCase()
      const usd = Number(pick.usd_value) || 0
      const emoji = usd >= 50_000_000 ? '🚨🐋' : '🐋'
      const chain = pick.blockchain ? ` on ${String(pick.blockchain).charAt(0).toUpperCase() + String(pick.blockchain).slice(1)}` : ''
      const dorm = await dormancyLine(pick.from_address, pick.timestamp)
      const pnl = dorm ? null : await pnlLine(pick.from_address, pick.to_address)
      const context = dorm || pnl
      text =
        `${emoji} ${fmtUsd(usd)} in $${sym} moved from ${fromName} to ${toName}${chain}.` +
        (context ? ` ${context}` : '') +
        `\n\nLive ${sym} whale flows → ${utm(`/token/${encodeURIComponent(sym)}`, 'whale_alerts')}`
    }

    if (dry) {
      return NextResponse.json({ dry: true, kind, would_post: text, tx: txId, postedToday, budget })
    }

    // 4. Post it.
    const result = await postTweet(text)

    // 5. Record state (best-effort).
    const nowIso = new Date().toISOString()
    if (result.ok) {
      await supabaseAdmin.from('app_cache').upsert({
        key: countKey,
        value: { count: postedToday + 1 },
        updated_at: nowIso,
      })
      if (txId) {
        await supabaseAdmin.from('app_cache').upsert({
          key: 'x_whale_alerts_posted',
          value: { hashes: [...postedHashes, txId].slice(-200) },
          updated_at: nowIso,
        })
      }
      if (famousSlug) {
        await supabaseAdmin.from('app_cache').upsert({
          key: famousKey,
          value: { slugs: [...postedSlugs, famousSlug] },
          updated_at: nowIso,
        })
      }
    }
    await supabaseAdmin.from('app_cache').upsert({
      key: 'x_quota_snapshot',
      value: { ...result.quota, at: nowIso, status: result.status },
      updated_at: nowIso,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, status: result.status, quota: result.quota }, { status: 502 })
    }
    return NextResponse.json({
      posted: true,
      kind,
      tweet_id: result.id,
      text,
      tx: txId,
      postedToday: postedToday + 1,
      budget,
      quota: result.quota,
    })
  } catch (err: any) {
    console.error('[XWhaleAlerts] Error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
