'use client'
import React from 'react'
import Statistics from '@/src/views/Statistics'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = {
  title: 'Whale Trades Scanner — Live Filters by Token, Chain, USD',
  description: 'Scan real-time whale transactions with powerful filters for token, side, chain, USD range, and time window.',
  alternates: { canonical: 'https://www.sonartracker.io/statistics' },
}

export default function StatisticsPage() {
  return (
    <AuthGuard>
      <Statistics />
    </AuthGuard>
  )
}
