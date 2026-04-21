import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import FiguresDirectoryClient from './FiguresDirectoryClient'
import SubmitFigureButton from './SubmitFigureButton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Figures | Sonar',
  description:
    'Directory of public on-chain entities tracked on Sonar.',
  // De-indexed 2026-04-21 pending per-record source attribution + a
  // working GDPR Art. 17 / right-of-publicity removal pathway. See
  // LEGAL_AUDIT_2026-04-21.md §1.D findings D1, D2, D3.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: 'https://www.sonartracker.io/figures' },
  openGraph: {
    title: 'Figures | Sonar',
    description:
      'Directory of public on-chain entities tracked on Sonar.',
    url: 'https://www.sonartracker.io/figures',
    type: 'website',
  },
}

const PAGE_SIZE = 24 // 4 × 6 desktop grid
const VALID_SORTS = new Set(['featured', 'recent', 'alphabetical', 'category'])
const DEFAULT_SORT = 'featured'

// Keep the dataset small enough to sort/slice client-side for snappy
// pagination UX. If `curated_entities` ever blows past this, move the
// pagination into the DB query.
async function fetchApprovedFigures() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select(
      'slug, display_name, description, category, avatar_url, twitter_handle, is_featured, addresses, created_at'
    )
    .eq('submission_status', 'approved')
  if (error) return []
  return data || []
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
  const all = await fetchApprovedFigures()
  const sorted = sortFigures(all, sort)
  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(1, page), totalPages)

  return (
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
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 800,
                marginBottom: '0.35rem',
                color: 'var(--text-primary)',
              }}
            >
              Public figures
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              {totalCount.toLocaleString()} verified figure
              {totalCount === 1 ? '' : 's'} · Page {clampedPage} of {totalPages}
            </div>
          </div>
          <SubmitFigureButton />
        </div>
      </div>

      <WalletTrackerTabs activeOverride="figures" />

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
    </main>
  )
}
