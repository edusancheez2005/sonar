'use client'
import React, { useState } from 'react'
import Landing from '@/src/views/Landing'

function FaqJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: 'Sonar Tracker - Frequently Asked Questions',
    description: 'Common questions about Sonar Tracker crypto analytics platform',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Sonar Tracker?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sonar Tracker is a real-time cryptocurrency analytics platform that specializes in whale transaction monitoring, token leaderboards, and comprehensive on-chain insights. Our AI-powered system tracks institutional trading patterns across major blockchains to help traders and investors make informed decisions.'
        },
      },
      {
        '@type': 'Question',
        name: 'How do whale alerts work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our whale alert system continuously monitors blockchain networks for large transactions (typically $100K+). When detected, these transactions are instantly surfaced in our Statistics page and Dashboard with detailed filters by token, blockchain, transaction type, USD value, and time. Users can set custom alert thresholds for personalized notifications.'
        },
      },
      {
        '@type': 'Question',
        name: 'Which blockchains are supported?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We support all major EVM-compatible blockchains including Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, and many others. Our database continuously tracks transactions across these networks. You can filter by specific chains in our Statistics section to see current coverage and network activity.'
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need an account to use Sonar Tracker?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can browse all public pages including Statistics, News, and general market data without an account. However, creating a free account unlocks additional features like personalized dashboards, custom alerts, saved filters, and access to our AI-powered insights and recommendations.'
        },
      },
      {
        '@type': 'Question',
        name: 'Is the data real-time?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, absolutely. Our ingestion pipeline updates continuously with sub-second latency for critical transactions. The UI refreshes automatically with the latest data, and our real-time alerts ensure you never miss important market movements. All data is processed through our 8-phase AI analysis engine for maximum accuracy.'
        },
      },
      {
        '@type': 'Question',
        name: 'What makes Sonar Tracker different from other crypto analytics platforms?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sonar Tracker stands out with our proprietary 8-phase AI analysis pipeline that goes beyond simple transaction monitoring. We provide institutional-grade insights including pattern recognition, whale behavior analysis, transaction clustering, risk assessment, market sentiment analysis, volume correlation, temporal analysis, and predictive modeling - all in real-time.'
        },
      },
      {
        '@type': 'Question',
        name: 'Is Sonar Tracker free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Sonar Tracker is currently in demo phase and completely free to use. You can access all features including real-time whale tracking, advanced analytics, AI insights, and comprehensive market data at no cost. We may introduce premium features in the future but will always maintain a free tier.'
        },
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
      <div className="container" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="email" placeholder="Get whale alerts — enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1, padding: '0.5rem' }} />
          <button type="submit" disabled={submitting} className="buy">{submitting ? 'Submitting…' : 'Subscribe'}</button>
        </form>
        {message && <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>{message}</p>}
      </div>
      <FaqJsonLd />
    </>
  )
}
