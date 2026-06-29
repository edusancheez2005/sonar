import React from 'react'
import HomeClient from './HomeClient'

export const metadata = {
  title: { absolute: 'Sonar Tracker — Real-Time Crypto Whale Intelligence' },
  description: 'Track crypto whale transactions in real-time across 10+ blockchains. On-chain analytics and ORCA 2.0 research assistant. Free tier; Pro $7.99/month. Not investment advice.',
  alternates: { canonical: 'https://www.sonartracker.io' },
  openGraph: {
    title: 'Sonar Tracker — Real-Time Crypto Whale Intelligence',
    description: 'Track crypto whale transactions in real-time. On-chain analytics and ORCA research assistant. Not investment advice.',
    url: 'https://www.sonartracker.io',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonar Tracker — Real-Time Crypto Whale Intelligence',
    description: 'Track whale transactions in real-time. ORCA 2.0 research assistant. $7.99/month.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

function FaqJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': 'https://www.sonartracker.io/#faq',
        name: 'Sonar Tracker Crypto - Frequently Asked Questions',
        description: 'Comprehensive answers to common questions about crypto whale tracking, blockchain analytics, and institutional trading tools',
        inLanguage: 'en-US',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Sonar Tracker and how does it help crypto traders?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar Tracker is a cryptocurrency analytics platform focused on real-time whale transaction monitoring, token leaderboards, and on-chain insights. The system tracks large-holder trading patterns across major blockchains including Ethereum, BSC, Polygon, and others. Users browse whale movements and market context as descriptive data for their own research. Sonar does not provide investment advice or trading recommendations.'
            },
          },
          {
            '@type': 'Question',
            name: 'How do whale alerts work on Sonar Tracker?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Our advanced whale alert system continuously monitors blockchain networks for large transactions (typically $100K+). When detected, these transactions are instantly surfaced in our Statistics page and Dashboard with detailed filters by token, blockchain, transaction type, USD value, and time. Users can set custom alert thresholds for personalized notifications, track specific wallets, and receive real-time alerts via email or in-app notifications. Our AI algorithms analyze transaction patterns to distinguish between legitimate whale activity and potential market manipulation.'
            },
          },
          {
            '@type': 'Question',
            name: 'Which blockchain networks does Sonar Tracker support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar Tracker supports all major EVM-compatible blockchains including Ethereum (ETH), Binance Smart Chain (BSC), Polygon (MATIC), Arbitrum, Optimism, Avalanche (AVAX), Fantom, and many others. Our database continuously tracks transactions across these networks with real-time data ingestion. You can filter by specific chains in our Statistics section to see current coverage, network activity, gas fees, and cross-chain transaction patterns. We also monitor Layer 2 solutions and emerging blockchains as they gain adoption.'
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need to create an account to use Sonar Tracker?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You can browse all public pages including Statistics, News, whale leaderboards, and general market data without creating an account. Creating a free account unlocks personalized dashboards, custom alert thresholds, saved filters, portfolio tracking, and access to the ORCA research assistant. Premium features may be introduced in the future, but the core analytics will always remain free for individual users. Sonar provides descriptive data, not investment advice.'
            },
          },
          {
            '@type': 'Question',
            name: 'Is Sonar Tracker data real-time and how accurate is it?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar Tracker provides near real-time data for whale transactions. The ingestion pipeline updates every 15 minutes across supported blockchains and the UI refreshes automatically. The platform aggregates on-chain transactions, public news, and social metrics into descriptive views. Sonar does not provide financial advice or trade recommendations. Past performance of any displayed metric does not guarantee future results.'
            },
          },
          {
            '@type': 'Question',
            name: 'What makes Sonar Tracker different from other crypto analytics platforms?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar Tracker differs from typical block explorers by combining real-time whale transaction monitoring with curated news context and an LLM-based research assistant (ORCA). The platform surfaces descriptive on-chain data — transaction sizes, net flows, sentiment scores, social engagement — in an interface designed for individual users. Sonar is not a trading service and does not provide investment advice or guarantee any outcome.'
            },
          },
          {
            '@type': 'Question',
            name: 'Is Sonar Tracker free to use and what are the pricing plans?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Sonar Tracker is currently in demo phase and completely free to use for all users. You can access all core features including real-time whale tracking, advanced analytics, AI insights, comprehensive market data, and basic alert systems at no cost. We may introduce premium features in the future such as advanced portfolio tracking, custom API access, white-label solutions, or institutional-grade reporting tools. However, we are committed to maintaining a robust free tier that provides significant value to individual traders and small investment firms.'
            },
          },
          {
            '@type': 'Question',
            name: 'How do I set up custom whale alerts and notifications?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Setting up custom whale alerts is simple: 1) Create a free account on Sonar Tracker, 2) Navigate to the Alerts section in your dashboard, 3) Set your alert parameters including minimum transaction size (in USD), specific tokens to monitor, blockchain networks, and alert frequency, 4) Choose your notification preferences (email, in-app, SMS for premium users), 5) Save your alert configuration. Our AI system will continuously monitor for matching transactions and notify you instantly when whale activity meets your criteria. You can create multiple alert profiles for different trading strategies.'
            },
          },
          {
            '@type': 'Question',
            name: 'Can Sonar Tracker help me identify market manipulation or wash trading?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar surfaces several heuristics that may flag suspicious trading activity, including wash-trading patterns, coordinated wallet behaviour, and unusual volume clustering. These are descriptive observations, not verdicts. Users can review the underlying transactions themselves on each token page. The flags are informational; Sonar does not provide investment advice and does not guarantee that flagged or unflagged activity reflects real-world manipulation.'
            },
          },
          {
            '@type': 'Question',
            name: 'Does Sonar Tracker provide historical data and backtesting capabilities?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Absolutely, Sonar Tracker provides comprehensive historical data dating back several years across all supported blockchains. You can access historical whale transactions, token performance data, market correlations, and trading patterns for backtesting your strategies. Our platform includes advanced filtering and search capabilities to analyze historical data by time periods, token pairs, wallet addresses, and transaction sizes. The historical data is integrated with our AI analysis engine, allowing you to see how past patterns correlate with current market conditions and validate trading strategies against historical performance.'
            },
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://www.sonartracker.io/#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://www.sonartracker.io/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Statistics',
            item: 'https://www.sonartracker.io/statistics',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Dashboard',
            item: 'https://www.sonartracker.io/dashboard',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'AI Advisor',
            item: 'https://www.sonartracker.io/ai-advisor',
          },
        ],
      },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default function HomePage() {
  return (
    <>
      <HomeClient />
      <FaqJsonLd />
    </>
  )
}
