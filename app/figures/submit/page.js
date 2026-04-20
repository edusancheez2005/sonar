import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import FigureSubmitClient from './FigureSubmitClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Submit a figure | Sonar',
  description:
    'Suggest a new public figure, company, or protocol for Sonar to track. Submissions go through a quick review before appearing publicly.',
  alternates: { canonical: 'https://www.sonartracker.io/figures/submit' },
  robots: { index: false, follow: false },
}

export default function FigureSubmitPage() {
  return (
    <AuthGuard>
      <main
        className="container"
        style={{
          padding: '2rem 1rem',
          maxWidth: '900px',
          color: 'var(--text-primary)',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              marginBottom: '0.35rem',
              color: 'var(--text-primary)',
            }}
          >
            Submit a figure
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Suggest a public figure, company, or protocol you think Sonar
            should track. A Sonar editor will review it within 48 hours.
          </div>
        </div>

        <WalletTrackerTabs activeOverride="figures" />

        <FigureSubmitClient />
      </main>
    </AuthGuard>
  )
}
