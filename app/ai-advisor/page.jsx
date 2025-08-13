import React from 'react'
import ClientOrca from './ClientOrca'

export const metadata = {
  title: 'Orca 2.0 — AI Advisor for Whale‑Informed Trading',
  description: 'Orca 2.0 learns from whale flows to surface high‑confidence, risk‑aware ideas. Join the waitlist.',
  alternates: { canonical: 'https://www.sonartracker.io/ai-advisor' },
}

export default function AiAdvisorPage() {
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <ClientOrca />
    </main>
  )
} 