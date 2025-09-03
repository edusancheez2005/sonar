'use client'
import React, { useState } from 'react'
import Landing from '@/src/views/Landing'

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
              text: 'Sonar Tracker is a professional-grade cryptocurrency analytics platform that specializes in real-time whale transaction monitoring, token leaderboards, and comprehensive on-chain insights. Our AI-powered system tracks institutional trading patterns across major blockchains including Ethereum, BSC, Polygon, and others. Traders use our platform to identify whale movements, monitor market sentiment, and make data-driven trading decisions with institutional-grade analytics.'
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
              text: 'You can browse all public pages including Statistics, News, whale leaderboards, and general market data without creating an account. However, creating a free account unlocks powerful features like personalized dashboards, custom alert thresholds, saved filters, portfolio tracking, and access to our AI-powered insights and trading recommendations. Premium features may be introduced in the future, but the core analytics will always remain free for individual traders.'
            },
          },
          {
            '@type': 'Question',
            name: 'Is Sonar Tracker data real-time and how accurate is it?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Sonar Tracker provides absolutely real-time data with sub-second latency for critical transactions. Our ingestion pipeline updates continuously across all supported blockchains, and the UI refreshes automatically with the latest data. We employ an 8-phase AI analysis engine that includes pattern recognition, whale behavior analysis, transaction clustering, risk assessment, market sentiment analysis, volume correlation, temporal analysis, and predictive modeling. Our data accuracy is institutional-grade, with comprehensive validation and cross-chain verification to ensure reliability.'
            },
          },
          {
            '@type': 'Question',
            name: 'What makes Sonar Tracker different from other crypto analytics platforms?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sonar Tracker stands out with our proprietary 8-phase AI analysis pipeline that goes beyond simple transaction monitoring. We provide institutional-grade insights including advanced pattern recognition algorithms, sophisticated whale behavior analysis, intelligent transaction clustering, comprehensive risk assessment models, real-time market sentiment analysis, volume correlation studies, temporal analysis for trend identification, and predictive modeling for market forecasting. Unlike basic platforms, we offer professional-grade tools used by hedge funds and institutional traders, all wrapped in an intuitive interface accessible to retail traders.'
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
              text: 'Yes, our advanced AI algorithms are specifically designed to detect potential market manipulation patterns and suspicious trading activities. We analyze transaction patterns, wallet behaviors, and market correlations to identify: 1) Wash trading schemes, 2) Pump-and-dump operations, 3) Spoofing attempts, 4) Layering strategies, 5) Whale manipulation tactics. Our risk assessment models flag unusual activity with confidence scores, and our temporal analysis can detect coordinated buying/selling patterns across multiple wallets. This information is crucial for traders to avoid manipulated markets and make informed investment decisions.'
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
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubscribe(e) {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await res.json()
      setMessage(res.ok ? 'Thanks! You are subscribed.' : (json.error || 'Error'))
    } catch (err) { setMessage('Error') } finally { setSubmitting(false) }
  }

  return (
    <>
      <Landing />

      <FaqJsonLd />
    </>
  )
}
