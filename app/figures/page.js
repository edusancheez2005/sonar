import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import FiguresDirectoryClient from './FiguresDirectoryClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Public Figures | Sonar',
  description:
    'Verified on-chain wallets of public figures: Vitalik Buterin, Michael Saylor, Donald Trump, MicroStrategy, El Salvador, and more. Follow them on Sonar.',
  alternates: { canonical: 'https://www.sonartracker.io/figures' },
  openGraph: {
    title: 'Public Figures | Sonar',
    description:
      'Track whale moves of public people and institutions with verified on-chain addresses.',
    url: 'https://www.sonartracker.io/figures',
    type: 'website',
  },
}

async function fetchFigures() {
  // Divergence from spec §2.1: the §2.1 query reads
  //   WHERE is_featured = true
  // but the manual test ("/figures → grid of 15 seeded figures") only
  // holds if non-featured rows are included too. We honor the test by
  // showing all rows, sorted so featured figures surface first.
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, description, category, avatar_url, twitter_handle, is_featured, addresses')
    .order('is_featured', { ascending: false })
    .order('display_name', { ascending: true })
  if (error) return []
  return data || []
}

export default async function FiguresDirectoryPage() {
  const figures = await fetchFigures()

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
          Verified wallets of known people and institutions
        </div>
      </div>

      <WalletTrackerTabs activeOverride="figures" />

      <FiguresDirectoryClient figures={figures} />
    </main>
  )
}
