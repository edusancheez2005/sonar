import React from 'react'
import AnalyticsGate from '../components/AnalyticsGate'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'
import Breadcrumbs from './components/Breadcrumbs'
import ConsentGatedScripts from './components/ConsentGatedScripts'

// Imported here (root layout) so it ships in the main always-loaded CSS
// bundle rather than a per-route chunk. Avoids 'Loading CSS chunk failed'
// errors after a redeploy when ConnectWalletModal is dynamically imported.
import '@solana/wallet-adapter-react-ui/styles.css'

const siteUrl = 'https://www.sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sonar Tracker — Real-Time Crypto Whale Tracker & On-Chain Intelligence',
    template: '%s | Sonar Tracker'
  },
  description: 'Track crypto whale transactions in real time across 10+ blockchains. On-chain analytics, whale alerts, and the ORCA AI research assistant. Free tier; Pro $7.99/mo. Not investment advice.',
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
    title: 'Sonar Tracker — Real-Time Crypto Whale Tracker & On-Chain Intelligence',
    description: 'Track crypto whale transactions in real time across 10+ blockchains. On-chain analytics, whale alerts, and the ORCA AI research assistant. Free tier; Pro $7.99/mo.',
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
    title: 'Sonar Tracker — Real-Time Crypto Whale Tracker',
    description: 'Track crypto whale transactions in real time across 10+ blockchains. On-chain analytics, whale alerts, and the ORCA AI research assistant.',
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
          email: 'saif@sonartracker.io',
        },
      },
      {
        '@type': 'WebApplication',
        name: 'Sonar Tracker',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web Browser',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            name: 'Pro',
            price: '7.99',
            priceCurrency: 'USD',
            url: `${siteUrl}/subscribe`,
          },
        ],
        description: 'Real-time crypto whale tracker and on-chain analytics platform with whale alerts and the ORCA AI research assistant.',
        screenshot: [
          `${siteUrl}/screenshots/stats-dashboard.png`,
          `${siteUrl}/screenshots/top-coins.png`,
          `${siteUrl}/screenshots/news-feed.png`,
        ],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* News Terminal editorial redesign fonts (app/news). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Libre+Franklin:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
