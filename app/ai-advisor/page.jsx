import React from 'react'
import ClientOrca from './ClientOrca'

export const metadata = { title: 'Orca 2.0 — AI Advisor' }

export default function AiAdvisorPage() {
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <ClientOrca />
    </main>
  )
} 