import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'

const siteUrl = 'https://www.sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  title: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
  description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
    description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains.',
    url: siteUrl,
    siteName: 'Sonar Tracker',
    images: [ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
    description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains.',
    images: [ogImage],
  },
}

function JsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        url: siteUrl,
        name: 'Sonar Tracker',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/statistics?token={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'Sonar Tracker',
        url: siteUrl,
        logo: `${siteUrl}/logo2.png`,
        sameAs: [
          'https://x.com',
          'https://www.linkedin.com',
        ],
      },
    ],
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ClientRoot>{children}</ClientRoot>
        </StyledComponentsRegistry>
        <Analytics />
        <JsonLd />
      </body>
    </html>
  )
}
