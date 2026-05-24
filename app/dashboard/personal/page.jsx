import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import PersonalDashboardClient from './PersonalDashboardClient'

export const metadata = {
  title: 'Personal Dashboard — Your Watchlist & ORCA Copilot',
  description:
    'Your personalised SONAR dashboard. Track only the tokens you care about and chat with ORCA about what is moving them.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://www.sonartracker.io/dashboard/personal' },
}

export default function PersonalDashboardPage() {
  return (
    <AuthGuard>
      <PersonalDashboardClient />
    </AuthGuard>
  )
}
