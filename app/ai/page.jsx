import React from 'react'
import AskOrcaClient from './AskOrcaClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: { absolute: 'Ask ORCA — Crypto AI Copilot | Sonar Tracker' },
  description: 'Ask ORCA anything about crypto: token research, whale flows, news, your watchlist. Long-form, sourced answers powered by Sonar Tracker on-chain data.',
  alternates: { canonical: 'https://www.sonartracker.io/ai' },
  openGraph: {
    title: 'Ask ORCA — Crypto AI Copilot',
    description: 'Ask ORCA anything about crypto. Long-form, sourced answers powered by Sonar Tracker on-chain data.',
    url: 'https://www.sonartracker.io/ai',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Ask ORCA' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ask ORCA — Crypto AI Copilot',
    description: 'Ask ORCA anything about crypto. Powered by Sonar Tracker.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

export default function AiPage() {
  return <AskOrcaClient />
}
