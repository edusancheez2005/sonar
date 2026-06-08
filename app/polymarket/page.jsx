import React, { Suspense } from 'react'
import PolymarketClient from './PolymarketClient'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'

export const metadata = {
  title: 'Polymarket Whale Radar — Top Markets & Whale Leaderboard | Sonar',
  description:
    'Track the biggest whales on Polymarket: top markets by whale flow, a whale leaderboard by position size, and drill-downs into who holds what.',
  alternates: { canonical: 'https://www.sonartracker.io/polymarket' },
}

export default function PolymarketPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SonarLoader />
        </div>
      }
    >
      <PolymarketClient />
    </Suspense>
  )
}
