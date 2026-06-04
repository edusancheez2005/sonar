import React, { Suspense } from 'react'
import PolymarketClient from './PolymarketClient'

export const metadata = {
  title: 'Polymarket Whale Radar — Top Markets & Whale Leaderboard | Sonar',
  description:
    'Track the biggest whales on Polymarket: top markets by whale flow, a whale leaderboard by position size, and drill-downs into who holds what.',
  alternates: { canonical: 'https://www.sonartracker.io/polymarket' },
}

export default function PolymarketPage() {
  return (
    <Suspense fallback={null}>
      <PolymarketClient />
    </Suspense>
  )
}
