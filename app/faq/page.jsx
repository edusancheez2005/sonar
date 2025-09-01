import React from 'react'

export const metadata = {
  title: 'FAQ — Sonar Tracker',
  description: 'Answers to common questions about whale tracking, data freshness, accounts, and free access.',
  alternates: { canonical: 'https://www.sonartracker.io/faq' },
}

const QA = [
  {
    q: 'What is Sonar Tracker?',
    a: 'Sonar is a real‑time crypto analytics app that monitors large on‑chain transactions ("whale" activity), classifies them by side (buy/sell/transfer), and aggregates the data into dashboards and leaderboards so you can spot where big money is moving.'
  },
  {
    q: 'Which blockchains are supported?',
    a: 'We start with major EVM networks and top chains tracked in our database. You can see current coverage via the Chain filter on the Statistics page.'
  },
  {
    q: 'How fresh is the data?',
    a: 'Ingestion runs continuously. Most widgets update within seconds; token and whale pages revalidate frequently. The Algorithm Active badge reflects the recency of the latest transaction in the database.'
  },
  {
    q: 'Do I need an account to use Sonar?',
    a: 'Public pages are browsable without an account. Creating an account unlocks personalized features (e.g., saved filters, alerts) as we roll them out.'
  },
  {
    q: 'How do you determine buy vs sell?',
    a: 'We apply heuristics using transfer direction, liquidity venues, and context to classify side. Pure internal transfers are separated from clear buy/sell activity to reduce noise.'
  },
  {
    q: 'Is whale tracking the same as copy trading?',
    a: 'No. Whale tracking reveals flow regimes. You can use it to inform entries and risk management, but it is not financial advice.'
  },
  {
    q: 'How much does Sonar cost?',
    a: 'Sonar is currently completely free to use! We\'re in our demo phase and offering full access to all features without any cost. Future pricing will be announced with advance notice.'
  },
]

export default function FAQPage() {
  return (
    <main className="container" style={{ padding: '2rem', maxWidth: 840 }}>
      <h1>Frequently Asked Questions</h1>
      <p style={{ color: 'var(--text-secondary)' }}>If your question isn’t here, reach us via the footer links.</p>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {QA.map((item, i) => (
          <details key={i} style={{ background: 'var(--background-card)', border: '1px solid var(--secondary)', borderRadius: 8, padding: '0.75rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.q}</summary>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{item.a}</p>
          </details>
        ))}
      </div>
    </main>
  )
} 