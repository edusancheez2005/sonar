import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import FiguresDirectoryClient from './FiguresDirectoryClient'
import SubmitFigureButton from './SubmitFigureButton'
import CoverageInProgress from './CoverageInProgress'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import DirectoryHeader from '@/app/components/whale-terminal/DirectoryHeader'

// PERF: was force-dynamic + supabaseAdminFresh, so every navigation loaded the
// entire curated_entities + figure_backtests tables uncached. Switch to ISR:
// served from cache, refreshed at most every 5 min. Newly-seeded figures now
// appear within the revalidate window instead of instantly, an acceptable
// trade for a fast directory.
export const revalidate = 300

export const metadata = {
  title: 'Figures | Sonar',
  description:
    'Directory of verified public figures with sourced on-chain addresses on Sonar.',
  // De-indexed 2026-04-21 pending per-record source attribution + a
  // working GDPR Art. 17 / right-of-publicity removal pathway. See
  // LEGAL_AUDIT_2026-04-21.md §1.D findings D1, D2, D3.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: 'https://www.sonartracker.io/figures' },
  openGraph: {
    title: 'Figures | Sonar',
    description:
      'Directory of verified public figures with sourced on-chain addresses on Sonar.',
    url: 'https://www.sonartracker.io/figures',
    type: 'website',
  },
}

const PAGE_SIZE = 24 // 4 × 6 desktop grid
const VALID_SORTS = new Set(['featured', 'recent', 'alphabetical', 'category', 'performance'])
const DEFAULT_SORT = 'featured'

// Keep the dataset small enough to sort/slice client-side for snappy
// pagination UX. If `curated_entities` ever blows past this, move the
// pagination into the DB query.
//
// Empty-address rows are deliberately HIDDEN from the public directory.
// The seed ships with placeholder rows for figures whose personal
// wallets aren't publicly attributable; those rows are visible to
// admins via /admin/figures/backfill but should not surface here.
async function fetchApprovedFigures() {
  // ISR-cached (see `revalidate` above): use the cacheable client.
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select(
      'slug, display_name, description, category, avatar_url, twitter_handle, is_featured, addresses, created_at'
    )
    .eq('submission_status', 'approved')
  if (error) return []
  return (data || []).filter(
    (r) => Array.isArray(r.addresses) && r.addresses.length > 0
  )
}

// Approved figures that don't yet have any verified addresses. Surfaced
// in a muted "Coverage in progress" strip so the directory communicates
// pipeline coverage without rendering dead deeplinks.
async function fetchCoverageInProgress() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, avatar_url, twitter_handle, addresses')
    .eq('submission_status', 'approved')
  if (error) return []
  return (data || [])
    .filter((r) => !Array.isArray(r.addresses) || r.addresses.length === 0)
    .sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || '')))
}

// Pre-computed nightly by /api/cron/backtest-figures. Returns a Map
// keyed by slug so the page-load merge stays O(n). Uses the fresh
// client so the directory always reflects the latest cron write — the
// regular supabaseAdmin lets Next.js cache PostgREST responses for the
// route's lifetime, which made every page render show stale `null`s
// for hours after a successful cron.
async function fetchBacktestMap() {
  const { data, error } = await supabaseAdmin
    .from('figure_backtests')
    .select('slug, return_pct_7d, return_pct_90d, computed_at')
  if (error || !Array.isArray(data)) return new Map()
  return new Map(data.map((r) => [r.slug, r]))
}

function sortFigures(rows, sort) {
  const list = [...rows]
  const byName = (a, b) =>
    String(a.display_name || '').localeCompare(String(b.display_name || ''))
  switch (sort) {
    case 'recent':
      list.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || byName(a, b)
      )
      break
    case 'alphabetical':
      list.sort(byName)
      break
    case 'category':
      list.sort(
        (a, b) =>
          String(a.category || '').localeCompare(String(b.category || '')) || byName(a, b)
      )
      break
    case 'performance':
      // Highest 90d backtested return first; figures with no backtest
      // row yet (newly added) drop to the bottom but stay alphabetical
      // among themselves so the page never looks empty.
      list.sort((a, b) => {
        const ra = a.return_pct_90d
        const rb = b.return_pct_90d
        const aHas = typeof ra === 'number' && Number.isFinite(ra)
        const bHas = typeof rb === 'number' && Number.isFinite(rb)
        if (aHas && bHas) return rb - ra || byName(a, b)
        if (aHas) return -1
        if (bHas) return 1
        return byName(a, b)
      })
      break
    case 'featured':
    default:
      list.sort(
        (a, b) => Number(b.is_featured || 0) - Number(a.is_featured || 0) || byName(a, b)
      )
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

export default async function FiguresDirectoryPage({ searchParams }) {
  const { sort, page } = parseSearchParams(searchParams || {})
  const [all, btMap, coverage] = await Promise.all([
    fetchApprovedFigures(),
    fetchBacktestMap(),
    fetchCoverageInProgress(),
  ])
  const enriched = all.map((f) => {
    const bt = btMap.get(f.slug)
    return {
      ...f,
      return_pct_7d: bt?.return_pct_7d ?? null,
      return_pct_90d: bt?.return_pct_90d ?? null,
    }
  })
  const sorted = sortFigures(enriched, sort)
  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(1, page), totalPages)

  return (
    <WhaleTerminalShell
      title="WHALE_TERMINAL // FIGURES"
      statusSegments={[{ k: 'FIGURES', v: totalCount.toLocaleString() }]}
    >
      <DirectoryHeader
        subtitle={
          <>
            {totalCount.toLocaleString()} verified figure
            {totalCount === 1 ? '' : 's'} · Page {clampedPage} of {totalPages}
          </>
        }
        right={<SubmitFigureButton />}
      />

      {/* Client renders sort dropdown, search, grid, pagination. Data
          is fully sorted server-side so search bypass in the client is
          a pure in-memory filter. */}
      <FiguresDirectoryClient
        figures={sorted}
        page={clampedPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        sort={sort}
      />

      <CoverageInProgress figures={coverage} />
    </WhaleTerminalShell>
  )
}
