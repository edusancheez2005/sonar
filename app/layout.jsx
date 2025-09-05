import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ClientRoot from './components/ClientRoot'
import StyledComponentsRegistry from './components/StyledComponentsRegistry'
import Script from 'next/script'

const siteUrl = 'https://www.sonartracker.io'
const ogImage = '/screenshots/stats-dashboard.png'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sonar Tracker — Crypto Tracker Sonar | Real‑Time Whale Tracking & Blockchain Analytics',
    template: '%s | Sonar Tracker Crypto'
  },
  description: 'Sonar Tracker: The leading crypto tracker sonar platform for real-time whale monitoring. Professional blockchain analytics, crypto tracker sonar technology, and institutional trading insights. Track crypto whales with Sonar Tracker.',
  keywords: [
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
    // Long-tail variations
    'sonar tracker crypto whale',
    'crypto tracker sonar whale',
    'sonar whale tracking platform',
    'crypto sonar whale tracker'
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
    title: 'Sonar Tracker — Crypto Tracker Sonar | Real‑Time Whale Transactions & Analytics',
    description: 'Sonar Tracker: The leading crypto tracker sonar platform. Track crypto whales in real time with our crypto sonar tracker technology. Professional blockchain analytics for institutional traders.',
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
    description: 'Sonar Tracker: Professional crypto tracker sonar platform. Real-time whale monitoring with crypto sonar tracker technology for institutional trading.',
    images: [ogImage],
    creator: '@sonartracker',
    site: '@sonartracker',
  },
  verification: {
    google: 'google-site-verification=kUMRrdT4lX2VHZbCenjhRbxFfOQVd_gUzMtqpxaaa_A',
    yandex: 'your-yandex-verification-code',
    bing: 'your-bing-verification-code',
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
      { url: '/logo2.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/logo2.png', sizes: '180x180' },
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
      <head>
        {/* Google Tag Manager */}
        <Script
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GT-WB29592G');
            `,
          }}
        />
        {/* Google Analytics 4 */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-FCN0KTJYLB"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-FCN0KTJYLB', {
                page_title: document.title,
                page_location: window.location.href,
                custom_map: {'dimension1': 'page_type'},
                send_page_view: true
              });

              // Track page type for better segmentation
              const pageType = window.location.pathname.includes('/dashboard') ? 'dashboard' :
                             window.location.pathname.includes('/statistics') ? 'statistics' :
                             window.location.pathname.includes('/news') ? 'news' :
                             window.location.pathname.includes('/ai-advisor') ? 'ai_advisor' :
                             window.location.pathname === '/' ? 'homepage' : 'other';

              gtag('event', 'page_type', {
                page_type: pageType,
                custom_parameter_1: window.location.pathname
              });
            `,
          }}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GT-WB29592G"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

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
