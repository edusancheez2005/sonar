import React from 'react'
import PersonalDashboardClient from './PersonalDashboardClient'

export const metadata = {
  title: 'Personal — Your Coins, Wallets and Alerts',
  description:
    'Your coins, the wallets you follow and your alerts on one page, with each large on-chain move explained.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://www.sonartracker.io/dashboard/personal' },
}

export default function PersonalDashboardPage() {
  return (
    <PersonalDashboardClient />
  )
}
