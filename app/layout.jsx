import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'

const siteUrl = 'https://www.sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
    template: '%s | Sonar Tracker'
  },
  description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains. Monitor institutional trading patterns with AI-powered insights.',
  keywords: [
    'crypto whale tracking',
    'blockchain analytics',
    'whale alerts',
    'cryptocurrency monitoring',
    'token leaderboards',
    'on-chain analysis',
    'real-time crypto data',
    'institutional trading',
    'blockchain intelligence',
    'crypto market analysis',
    'whale wallet tracker',
    'crypto analytics platform',
    'blockchain monitoring',
    'crypto intelligence',
    'whale transaction monitoring'
  ],
  authors: [{ name: 'Sonar Tracker Team' }],
  creator: 'Sonar Tracker',
  publisher: 'Sonar Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: { canonical: siteUrl },
  category: 'Cryptocurrency',
  classification: 'Blockchain Analytics',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
    description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains. Monitor institutional trading patterns with AI-powered insights.',
    url: siteUrl,
    siteName: 'Sonar Tracker',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Sonar Tracker - Real-Time Crypto Whale Tracking Dashboard',
      },
      {
        url: '/screenshots/top-coins.png',
        width: 1200,
        height: 630,
        alt: 'Sonar Tracker - Top Coin Analysis',
      },
      {
        url: '/screenshots/news-feed.png',
        width: 1200,
        height: 630,
        alt: 'Sonar Tracker - Crypto News Feed',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonar Tracker — Real‑Time Whale Transactions & Crypto Analytics',
    description: 'Track crypto whales in real time: live transactions, token leaderboards, whale alerts, and on‑chain analytics across top blockchains.',
    images: [ogImage],
    creator: '@sonartracker',
    site: '@sonartracker',
  },
  verification: {
    google: 'your-google-site-verification-code',
    yandex: 'your-yandex-verification-code',
    bing: 'your-bing-verification-code',
  },
  other: {
    'msapplication-TileColor': '#3498db',
    'theme-color': '#0a1621',
  },
}

function JsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: 'Sonar Tracker',
        description: 'Real-time crypto whale tracking and blockchain analytics platform',
        publisher: { '@id': `${siteUrl}#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/statistics?token={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'en-US',
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}#organization`,
        name: 'Sonar Tracker',
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/logo2.png`,
          width: 200,
          height: 200,
        },
        foundingDate: '2024',
        description: 'Leading provider of real-time crypto whale tracking and blockchain analytics',
        sameAs: [
          'https://x.com/sonartracker',
          'https://www.linkedin.com/company/sonartracker',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'support@sonartracker.io',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Sonar Tracker',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: 'Real-time crypto whale tracking and blockchain analytics platform',
        screenshot: [
          `${siteUrl}/screenshots/stats-dashboard.png`,
          `${siteUrl}/screenshots/top-coins.png`,
          `${siteUrl}/screenshots/news-feed.png`,
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '100',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}#webpage`,
        url: siteUrl,
        name: 'Sonar Tracker - Real-Time Whale Transactions & Crypto Analytics',
        isPartOf: { '@id': `${siteUrl}#website` },
        about: { '@id': `${siteUrl}#organization` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: `${siteUrl}/screenshots/stats-dashboard.png`,
        },
        datePublished: '2024-01-01T00:00:00+00:00',
        dateModified: '2025-01-01T00:00:00+00:00',
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
        <SpeedInsights />
        <JsonLd />
      </body>
    </html>
  )
}
