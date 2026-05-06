import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import FrontierClient from './FrontierClient'

export const metadata = {
  title: 'Frontier — Solana Intelligence | Sonar',
  description:
    'Live SPL whale activity, bridge inflows into Solana, and measured signal accuracy from the Sonar engine.',
  alternates: { canonical: 'https://www.sonartracker.io/frontier' },
}

export default function FrontierPage() {
  return (
    <AuthGuard>
      <FrontierClient />
    </AuthGuard>
  )
}
