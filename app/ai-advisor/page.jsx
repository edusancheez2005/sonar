import React from 'react'
import ClientOrca from './ClientOrca'

export const metadata = {
  title: 'ORCA AI 2.0 — AI-Powered Crypto Intelligence',
  description: 'Chat with ORCA AI to get real-time crypto analysis powered by whale data, sentiment analysis, and social insights. Ask about any cryptocurrency.',
  alternates: { canonical: 'https://www.sonartracker.io/ai-advisor' },
}

export default function AiAdvisorPage() {
  return (
    <ClientOrca />
  )
} 