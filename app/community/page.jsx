import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import CommunityClient from './CommunityClient'

export const metadata = {
  title: 'Social Intelligence — Crypto Twitter, Influencers & Viral Posts | Sonar',
  description: 'Real-time crypto social intelligence: trending tweets, top influencers, AI market summaries, and viral posts from Trump, Elon, Vitalik, and 100+ crypto creators.',
  alternates: { canonical: 'https://www.sonartracker.io/community' },
}

export default function CommunityPage() {
  return (
    <AuthGuard>
      <CommunityClient />
    </AuthGuard>
  )
}

