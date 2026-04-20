import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import {
  isJunkEntityLabel,
  inferEntityType,
} from '@/app/lib/entityHelpers'
import EntitiesDirectoryClient from './EntitiesDirectoryClient'

export const dynamic = 'force-dynamic'

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

// Collapse noisy label variants to their canonical entity name so a
// row like "Wintermute - Market Maker (JUP holder)" groups with
// "Wintermute" instead of splintering the directory into 50 near-
// duplicates. Applied BEFORE group-by in `aggregateEntities` and also
// used to match curated company/government rows to labels.
function normalizeEntityName(label) {
  if (!label) return ''
  let t = String(label).trim()
  // Strip a chain of suffixes; run multiple passes because some
  // labels carry more than one (e.g. "Binance Exchange 2 (JUP holder)").
  let prev = null
  while (prev !== t) {
    prev = t
    t = t
      .replace(/\s*\([^()]*holder\)\s*$/i, '')        // "(JUP holder)"
      .replace(/\s*-\s*Market Maker\s*$/i, '')         // " - Market Maker"
      .replace(/\s+Exchange\s+\d+\s*$/i, ' Exchange')  // "Exchange 2" → "Exchange"
      .replace(/\s+Hot Wallet\s+\d+\s*$/i, ' Hot Wallet')
      .trim()
  }
  return t
}

async function fetchLabeledEntities() {
  const PAGE = 1000
  const MAX_PAGES = 30
  const rows = []
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE
    const to = from + PAGE - 1
    const { data, error } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('from_label, to_label, usd_value, blockchain, timestamp')
      .or('from_label.not.is.null,to_label.not.is.null')
      .order('timestamp', { ascending: false })
      .range(from, to)
    if (error) break
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

function aggregateEntities(rows) {
  const map = new Map()
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
      }
      map.set(name, rec)
    }
    rec.tx_count += 1
    rec.total_volume += Number(r.usd_value || 0)
    if (r.blockchain) rec.chains.add(String(r.blockchain).toLowerCase())
    if (!rec.last_active || new Date(r.timestamp) > new Date(rec.last_active)) {
      rec.last_active = r.timestamp
    }
  }
  return Array.from(map.values())
    .map((e) => ({
      entity_name: e.entity_name,
      tx_count: e.tx_count,
      total_volume: e.total_volume,
      last_active: e.last_active,
      chain_count: e.chains.size,
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

export default async function EntitiesDirectoryPage({ searchParams }) {
  const { sort, page } = parseSearchParams(searchParams || {})
  const [rawRows, curatedCompanies] = await Promise.all([
    fetchLabeledEntities(),
    fetchCuratedCompanies(),
  ])
  const labelEntities = aggregateEntities(rawRows)
  const merged = mergeCurated(labelEntities, curatedCompanies)
  const entities = sortEntities(merged, sort)
  const totalCount = entities.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const totalTx = entities.reduce((a, e) => a + (e.tx_count || 0), 0)

  return (
    <AuthGuard>
      <main
        className="container"
        style={{
          padding: '2rem 1rem',
          maxWidth: '1200px',
          color: 'var(--text-primary)',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              marginBottom: '0.35rem',
              color: 'var(--text-primary)',
            }}
          >
            Tracked Entities
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {totalCount.toLocaleString()} tracked entit
            {totalCount === 1 ? 'y' : 'ies'} · Page {clampedPage} of {totalPages} · Sorted by{' '}
            {SORT_LABELS[sort] || sort}
            {totalTx > 0 ? (
              <>
                {' '}
                · <span style={{ opacity: 0.75 }}>{totalTx.toLocaleString()} transactions indexed</span>
              </>
            ) : null}
          </div>
        </div>

        <WalletTrackerTabs activeOverride="entities" />

        <EntitiesDirectoryClient
          entities={entities}
          page={clampedPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          sort={sort}
        />
      </main>
    </AuthGuard>
  )
}
