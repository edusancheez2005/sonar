import React, { Suspense } from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import WatchlistClient from './WatchlistClient'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import DirectoryHeader from '@/app/components/whale-terminal/DirectoryHeader'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Following | Sonar',
  description:
    'Figures, entities, wallets, and Polymarket whales you follow on Sonar.',
  alternates: { canonical: 'https://www.sonartracker.io/watchlist' },
  openGraph: {
    title: 'Following | Sonar',
    description:
      'Your unified following list — figures, entities, wallets, and Polymarket whales.',
    url: 'https://www.sonartracker.io/watchlist',
    type: 'website',
  },
}

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <WhaleTerminalShell title="WHALE_TERMINAL // FOLLOWING">
        <DirectoryHeader subtitle="Figures, entities, wallets, and Polymarket whales you follow." />
        {/* WatchlistClient reads ?tab= via useSearchParams — Suspense required. */}
        <Suspense fallback={null}>
          <WatchlistClient />
        </Suspense>
      </WhaleTerminalShell>
    </AuthGuard>
  )
}
