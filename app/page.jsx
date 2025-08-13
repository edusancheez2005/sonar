'use client'
import React, { useState } from 'react'
import Landing from '@/src/views/Landing'

function FaqJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Sonar Tracker?',
        acceptedAnswer: { '@type': 'Answer', text: 'A real‑time crypto analytics platform focused on whale transactions, token leaderboards, and on‑chain insights.' },
      },
      {
        '@type': 'Question',
        name: 'How do whale alerts work?',
        acceptedAnswer: { '@type': 'Answer', text: 'We monitor large on‑chain transfers and surface them in Statistics and Dashboard, with filters by token, chain, side, USD, and time.' },
      },
      {
        '@type': 'Question',
        name: 'Which blockchains are supported?',
        acceptedAnswer: { '@type': 'Answer', text: 'Major EVM chains and top networks tracked in our database. Use the Chain filter in Statistics to see current coverage.' },
      },
      {
        '@type': 'Question',
        name: 'Do I need an account?',
        acceptedAnswer: { '@type': 'Answer', text: 'You can browse public pages without an account. Create an account to personalize alerts and access more features over time.' },
      },
      {
        '@type': 'Question',
        name: 'Is data real‑time?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. The ingestion pipeline updates continuously; the UI shows latest trades and aggregates with short revalidation windows.' },
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
