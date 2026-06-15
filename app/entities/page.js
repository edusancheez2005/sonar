import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { cached } from '@/app/lib/serverCache'
import {
  isJunkEntityLabel,
  inferEntityType,
  normalizeEntityName,
} from '@/app/lib/entityHelpers'
import EntitiesLedgerClient from './EntitiesLedgerClient'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import DirectoryHeader from '@/app/components/whale-terminal/DirectoryHeader'

/**
 * Aggregating /entities walks up to 30k whale-tx rows through the in-memory
 * grouper which is too slow for `force-dynamic` per-request. ISR-revalidate
 * caches the rendered HTML for 5 min so cold loads don't have to reaggregate;
 * follow / search are still fully client-side and stay fresh. MAX_PAGES is
 * also capped lower below for the same reason.
 */
export const revalidate = 300

export const metadata = {
  title: 'Entity Tracker | Sonar',
  description:
    'Browse the institutions, exchanges, market makers, and protocols Sonar tracks. Follow whale moves across CEXes like Binance, market makers like Wintermute, and DeFi protocols in real time.',
  alternates: { canonical: 'https://www.sonartracker.io/entities' },
  openGraph: {
    title: 'Entity Tracker | Sonar',
    description:
      'Browse institutions, exchanges, market makers, and protocols tracked by Sonar whale intelligence.',
    url: 'https://www.sonartracker.io/entities',
    type: 'website',
  },
}

async function fetchLabeledEntities() {
  const PAGE = 1000
  // 30 → 12 pages: keeps the Top-N entity cards intact (the directory only
  // shows the top ~200 by tx volume) and slashes cold-render latency. Older
  // rows beyond 12k still flow into the live whale feeds — they just don't
  // contribute to the cached aggregation.
  //
  // Pages are independent offset windows, so fire them in parallel: wall time
  // collapses from 12× a single query to ~1×. The partial index
  // `(timestamp DESC) WHERE from_label/to_label IS NOT NULL` on each base
  // chain table keeps every window cheap. Empty/short pages past the end of
  // the data just resolve to nothing.
  const MAX_PAGES = 12
  const pages = await Promise.all(
    Array.from({ length: MAX_PAGES }, async (_, i) => {
      const from = i * PAGE
      const to = from + PAGE - 1
      const { data, error } = await supabaseAdmin
        .from('all_whale_transactions')
        .select('from_label, to_label, usd_value, blockchain, timestamp')
        .or('from_label.not.is.null,to_label.not.is.null')
        .order('timestamp', { ascending: false })
        .range(from, to)
      if (error || !data) return []
      return data
    })
  )
  return pages.flat()
}

const SPARK_DAYS = 14

function aggregateEntities(rows) {
  const map = new Map()
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  for (const r of rows) {
    const rawName = r.from_label || r.to_label
    if (!rawName) continue
    const name = normalizeEntityName(rawName)
    if (!name) continue
    let rec = map.get(name)
    if (!rec) {
      rec = {
        entity_name: name,
        tx_count: 0,
        total_volume: 0,
        last_active: null,
        chains: new Set(),
        flow_in_24h: 0,
        flow_out_24h: 0,
        spark: new Array(SPARK_DAYS).fill(0),
      }
      map.set(name, rec)
    }
    const usd = Number(r.usd_value || 0)
    rec.tx_count += 1
    rec.total_volume += usd
    if (r.blockchain) rec.chains.add(String(r.blockchain).toLowerCase())
    if (!rec.last_active || new Date(r.timestamp) > new Date(rec.last_active)) {
      rec.last_active = r.timestamp
    }
    const ts = new Date(r.timestamp).getTime()
    if (Number.isFinite(ts)) {
      // Signed 24h flow: receiving label = inflow, sending label = outflow.
      // A row that carries both labels credits both entities once each.
      if (now - ts <= dayMs) {
        const inName = r.to_label ? normalizeEntityName(r.to_label) : null
        const outName = r.from_label ? normalizeEntityName(r.from_label) : null
        if (inName === name) rec.flow_in_24h += usd
        if (outName === name) rec.flow_out_24h += usd
      }
      // 14-day daily volume sparkline (oldest → newest).
      const daysAgo = Math.floor((now - ts) / dayMs)
      if (daysAgo >= 0 && daysAgo < SPARK_DAYS) {
        rec.spark[SPARK_DAYS - 1 - daysAgo] += usd
      }
    }
  }
  return Array.from(map.values())
    .map((e) => ({
      entity_name: e.entity_name,
      tx_count: e.tx_count,
      total_volume: e.total_volume,
      last_active: e.last_active,
      chain_count: e.chains.size,
      flow_in_24h: Math.round(e.flow_in_24h),
      flow_out_24h: Math.round(e.flow_out_24h),
      spark: e.spark.map((v) => Math.round(v)),
    }))
    .filter((e) => e.tx_count >= 10)
    .filter((e) => !isJunkEntityLabel(e.entity_name))
    .sort((a, b) => b.tx_count - a.tx_count)
    .slice(0, 200) // keep a larger pool; curated merge may bump cards in
    .map((e) => ({ ...e, entity_type: inferEntityType(e.entity_name) }))
}

// Pull curated company + government rows so brand-name entities
// (Tesla, BlackRock, a16z crypto, El Salvador, …) appear on /entities
// even when their on-chain labels don't — or show as enriched cards
// when the labels DO exist. `person` / `celebrity` categories stay on
// /figures only. Only approved submissions are surfaced publicly.
async function fetchCuratedCompanies() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, description, category, avatar_url, twitter_handle, addresses, submission_status')
    .in('category', ['company', 'government'])
    .or('submission_status.eq.approved,submission_status.is.null')
  if (error) return []
  return data || []
}

// Merge curated company/government rows into the label-aggregated
// list: enrich existing matches, append the rest as "Tracked" cards
// with tx_count = 0. Match keys are lowercased normalized names so
// casing differences don't split entities.
function mergeCurated(labelEntities, curatedRows) {
  const byKey = new Map()
  for (const e of labelEntities) {
    byKey.set(normalizeEntityName(e.entity_name).toLowerCase(), e)
  }

  for (const c of curatedRows) {
    const normalized = normalizeEntityName(c.display_name)
    const key = normalized.toLowerCase()
    const existing = byKey.get(key)
    if (existing) {
      // Enrich in place — keep the label's live stats, add brand info.
      existing.curated_slug = c.slug
      existing.avatar_url = c.avatar_url || existing.avatar_url || null
      existing.description = c.description || existing.description || null
      existing.twitter_handle = c.twitter_handle || existing.twitter_handle || null
      existing.verified = true
      // If the curated display_name has nicer casing (e.g. "a16z crypto"
      // vs an all-caps label), prefer the curated spelling.
      if (normalized !== existing.entity_name) existing.entity_name = normalized
    } else {
      byKey.set(key, {
        entity_name: normalized,
        tx_count: 0,
        total_volume: 0,
        last_active: null,
        chain_count: 0,
        entity_type: inferEntityType(normalized),
        curated_slug: c.slug,
        avatar_url: c.avatar_url || null,
        description: c.description || null,
        twitter_handle: c.twitter_handle || null,
        tracked: true,
      })
    }
  }

  // Re-sort so active entities rise above the "Tracked, 0 tx" brand
  // cards, but the latter still show on the page.
  return [...byKey.values()].sort((a, b) => {
    if ((b.tx_count || 0) !== (a.tx_count || 0)) return (b.tx_count || 0) - (a.tx_count || 0)
    return String(a.entity_name).localeCompare(String(b.entity_name))
  })
}

const PAGE_SIZE = 30 // 3 × 10 desktop grid
const VALID_SORTS = new Set(['volume', 'transactions', 'recent', 'alphabetical', 'verified'])
const DEFAULT_SORT = 'volume'

const SORT_LABELS = {
  volume: 'volume',
  transactions: 'transactions',
  recent: 'recent activity',
  alphabetical: 'A → Z',
  verified: 'verified',
}

function sortEntities(rows, sort) {
  const list = [...rows]
  const byVolume = (a, b) => (b.total_volume || 0) - (a.total_volume || 0)
  const byTx = (a, b) => (b.tx_count || 0) - (a.tx_count || 0)
  const byRecent = (a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0)
  const byName = (a, b) =>
    String(a.entity_name || '').localeCompare(String(b.entity_name || ''))
  switch (sort) {
    case 'transactions':
      list.sort((a, b) => byTx(a, b) || byVolume(a, b) || byName(a, b))
      break
    case 'recent':
      list.sort((a, b) => byRecent(a, b) || byVolume(a, b) || byName(a, b))
      break
    case 'alphabetical':
      list.sort(byName)
      break
    case 'verified':
      // Verified-enriched entities first, then curated tracked (zero-
      // activity) rows, then plain labels — with volume as tie-break.
      list.sort((a, b) => {
        const rank = (e) => (e.verified ? 2 : e.tracked ? 1 : 0)
        return rank(b) - rank(a) || byVolume(a, b) || byName(a, b)
      })
      break
    case 'volume':
    default:
      list.sort((a, b) => byVolume(a, b) || byTx(a, b) || byName(a, b))
      break
  }
  return list
}

function parseSearchParams(searchParams) {
  const rawSort = (searchParams?.sort || '').toString().toLowerCase()
  const sort = VALID_SORTS.has(rawSort) ? rawSort : DEFAULT_SORT
  const rawPage = Number(searchParams?.page)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  return { sort, page }
}

// Build the full directory (label aggregation + curated merge + dominance)
// once and memoize it. This is the expensive part — it pages up to 12k whale
// rows and groups them in memory — and it's identical for every request
// regardless of sort/page, so caching it decouples the heavy work from both
// per-request rendering AND ISR revalidation: a stale value serves instantly
// while a single background refresh runs, so no real user ever blocks on the
// cold aggregation. Sort/page are applied per-request below (cheap).
async function buildDirectory() {
  const [rawRows, curatedCompanies] = await Promise.all([
    fetchLabeledEntities(),
    fetchCuratedCompanies(),
  ])
  const labelEntities = aggregateEntities(rawRows)
  const merged = mergeCurated(labelEntities, curatedCompanies)
  // Dominance: each entity's share of all tracked volume in the directory.
  const volumeSum = merged.reduce((a, e) => a + (e.total_volume || 0), 0)
  for (const e of merged) {
    e.dominance = volumeSum > 0 ? (e.total_volume || 0) / volumeSum : 0
  }
  return merged
}

export default async function EntitiesDirectoryPage({ searchParams }) {
  const { sort, page } = parseSearchParams(searchParams || {})
  const merged = await cached('entities:directory:v1', buildDirectory, {
    ttl: 120_000,
    swr: 600_000,
  })
  const entities = sortEntities(merged, sort)
  const totalCount = entities.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const totalTx = entities.reduce((a, e) => a + (e.tx_count || 0), 0)

  const subtitle = (
    <>
      {totalCount.toLocaleString()} tracked entit
      {totalCount === 1 ? 'y' : 'ies'} · Page {clampedPage} of {totalPages} · Sorted by{' '}
      {SORT_LABELS[sort] || sort}
      {totalTx > 0 ? (
        <>
          {' '}
          · <span style={{ opacity: 0.75 }}>{totalTx.toLocaleString()} transactions indexed</span>
        </>
      ) : null}
    </>
  )

  return (
    <WhaleTerminalShell
      title="WHALE_TERMINAL // ENTITIES"
      live
      statusSegments={[
        { k: 'ENTITIES', v: totalCount.toLocaleString() },
        { k: 'TX INDEXED', v: totalTx.toLocaleString() },
      ]}
    >
      <DirectoryHeader subtitle={subtitle} />

      <EntitiesLedgerClient
        entities={entities}
        page={clampedPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        sort={sort}
      />
    </WhaleTerminalShell>
  )
}
