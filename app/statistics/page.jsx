import React from 'react'
import Statistics from '@/src/views/Statistics'

export const metadata = {
  title: 'Crypto Whale Scanner — Live Filters by Token, Chain, USD',
  description: 'Scan real-time crypto whale transactions with powerful filters for token, side, chain, USD range, and time window. Track large crypto trades with Sonar Tracker.',
  alternates: { canonical: 'https://www.sonartracker.io/statistics' },
}

export default function StatisticsPage() {
  return <Statistics />
}
