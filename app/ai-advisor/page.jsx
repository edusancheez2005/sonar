import React from 'react'
import ClientOrca from './ClientOrca'

export const metadata = {
  title: 'ORCA AI Crypto Analyst — AI-Powered Whale Intelligence | Sonar Tracker',
  description: 'Chat with ORCA AI to get real-time crypto whale analysis. AI-powered insights on whale movements, market sentiment, and on-chain data across 10+ blockchains.',
  alternates: { canonical: 'https://www.sonartracker.io/ai-advisor' },
  openGraph: {
    title: 'ORCA AI Crypto Analyst — AI-Powered Whale Intelligence | Sonar Tracker',
    description: 'Chat with ORCA AI for real-time whale analysis. Purpose-built AI for on-chain intelligence.',
    url: 'https://www.sonartracker.io/ai-advisor',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'ORCA AI Crypto Analyst' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ORCA AI — AI-Powered Crypto Whale Intelligence',
    description: 'Purpose-built AI analyst for on-chain whale intelligence. Part of Sonar Tracker.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const orcaSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ORCA AI Crypto Analyst',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web Browser',
  description: 'AI-powered crypto analyst that monitors whale transactions across 10+ blockchains and provides plain-English market intelligence. Built into Sonar Tracker.',
  url: 'https://www.sonartracker.io/ai-advisor',
  offers: {
    '@type': 'Offer',
    price: '7.99',
    priceCurrency: 'USD',
    description: 'Included with Sonar Tracker Pro subscription',
  },
  creator: {
    '@type': 'Organization',
    name: 'Sonar Tracker',
    url: 'https://www.sonartracker.io',
  },
}

export default function AiAdvisorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orcaSchema) }} />
      <ClientOrca />
    </>
  )
} 