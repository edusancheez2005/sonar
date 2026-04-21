import React from 'react'
import AnalyticsGate from '../components/AnalyticsGate'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'
import Breadcrumbs from './components/Breadcrumbs'
import ConsentGatedScripts from './components/ConsentGatedScripts'

const siteUrl = 'https://www.sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Crypto Tracker | Whale Wallet Tracker | Crypto Predictor Algorithm - Sonar Tracker',
    template: '%s | Sonar Tracker Crypto'
  },
  description: 'Sonar Tracker: The #1 crypto tracker and whale wallet tracker platform. Real-time crypto predictor algorithm monitors whale movements across blockchains. Professional crypto tracker for institutional traders. Track crypto whales with advanced analytics.',
  keywords: [
    // Primary high-volume keywords
    'crypto tracker',
    'whale wallet tracker',
    'crypto predictor algorithm',
    'cryptocurrency tracker',
    'whale tracker',
    'crypto whale tracker',
    // Primary brand variations
    'sonar tracker',
    'sonar tracker crypto',
    'sonar crypto tracker', 
    'crypto tracker sonar',
    'crypto sonar tracker',
    'sonar blockchain tracker',
    'tracker sonar crypto',
    'sonar whale tracker',
    // Core functionality keywords
    'crypto whale tracking platform',
    'blockchain analytics tool',
    'cryptocurrency whale alerts',
    'real time crypto monitoring',
    'crypto tracker platform',
    'whale tracker sonar',
    'crypto tracking sonar',
    'sonar crypto analytics',
    'blockchain tracker sonar',
    'crypto whale tracker sonar',
    'whale wallet tracking',
    'crypto prediction algorithm',
    'whale activity tracker',
    'crypto whale detector',
    // Professional/institutional terms
    'institutional crypto trading',
    'blockchain intelligence platform',
    'crypto market analysis tool',
    'whale transaction tracker',
    'crypto analytics dashboard',
    'blockchain monitoring software',
    'institutional crypto insights',
    'crypto trading analytics',
    'blockchain transaction monitoring',
    'crypto whale detection',
    'professional crypto analytics',
    'crypto sonar platform',
    'blockchain sonar analytics',
    'whale wallet analysis',
    'crypto predictor tool',
    'algorithmic crypto prediction',
    // Long-tail variations
    'sonar tracker crypto whale',
    'crypto tracker sonar whale',
    'sonar whale tracking platform',
    'crypto sonar whale tracker',
    'best crypto tracker',
    'real-time whale wallet tracker',
    'crypto market predictor',
    'whale movement tracker'
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
    title: 'Crypto Tracker | Whale Wallet Tracker | Crypto Predictor Algorithm - Sonar Tracker',
    description: 'Sonar Tracker: The #1 crypto tracker and whale wallet tracker. Real-time crypto predictor algorithm for tracking whale movements. Professional crypto tracker for institutional traders.',
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
    title: 'Sonar Tracker — Crypto Tracker Sonar | Whale Tracking Platform',
    description: 'Sonar Tracker: #1 crypto tracker, whale wallet tracker, and crypto predictor algorithm. Real-time whale monitoring for professional traders.',
    images: [ogImage],
    creator: '@sonartracker',
    site: '@sonartracker',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || 'kUMRrdT4lX2VHZbCenjhRbxFfOQVd_gUzMtqpxaaa_A',
    yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
  },
  other: {
    'msapplication-TileColor': '#3498db',
    'theme-color': '#0a1621',
    'color-scheme': 'dark light',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Sonar Tracker Crypto',
    'application-name': 'Sonar Tracker Crypto',
  },
  // Advanced SEO directives
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  // Additional meta tags for better SEO
  additionalMetaTags: [
    {
      name: 'author',
      content: 'Sonar Tracker Team',
    },
    {
      name: 'publisher',
      content: 'Sonar Tracker',
    },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
    {
      name: 'googlebot',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
    {
      name: 'bingbot',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
    {
      name: 'language',
      content: 'en-US',
    },
    {
      name: 'geo.region',
      content: 'US',
    },
    {
      name: 'geo.placename',
      content: 'Global',
    },
    {
      name: 'ICBM',
      content: '40.7128, -74.0060', // NYC coordinates for crypto hub
    },
    {
      name: 'revisit-after',
      content: '1 day',
    },
    {
      httpEquiv: 'content-language',
      content: 'en-US',
    },
    {
      httpEquiv: 'X-UA-Compatible',
      content: 'IE=edge',
    },
  ],
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
        description: 'Real-time crypto tracker, whale wallet tracker, and crypto predictor algorithm for blockchain analytics',
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
        description: 'Leading crypto tracker and whale wallet tracker platform with crypto predictor algorithm for blockchain analytics',
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
        description: 'Real-time crypto tracker, whale wallet tracker, and crypto predictor algorithm for blockchain analytics',
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
      <head>
        {/* Google Tag Manager + Google Analytics 4 are loaded only after
            the user grants analytics consent via the cookie banner.
            See LEGAL_AUDIT_2026-04-21.md §1.A finding A4. */}
      </head>
      <body>
        {/* Google Tag Manager noscript fallback is also gated on consent;
            a noscript iframe cannot be loaded conditionally on the client,
            so we omit it. Users without JS will not be tracked, which is
            the GDPR-safe default. */}

        <StyledComponentsRegistry>
          <ClientRoot>{children}</ClientRoot>
        </StyledComponentsRegistry>
        <ConsentGatedScripts />
        <AnalyticsGate />
        <JsonLd />
        <Breadcrumbs />
      </body>
    </html>
  )
}
