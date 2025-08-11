import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'

const siteUrl = 'https://sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  title: 'Sonar — Cryptocurrency Dashboard',
  description: 'Real-time cryptocurrency transaction monitoring, analytics, and news.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Sonar — Cryptocurrency Dashboard',
    description: 'Real-time cryptocurrency transaction monitoring, analytics, and news.',
    url: siteUrl,
    siteName: 'SONAR',
    images: [ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonar — Cryptocurrency Dashboard',
    description: 'Real-time cryptocurrency transaction monitoring, analytics, and news.',
    images: [ogImage],
  },
}

function JsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SONAR',
    url: siteUrl,
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
