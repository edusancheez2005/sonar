import React from 'react'
import News from '@/src/views/News'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = {
  title: 'Crypto News — Market Moves, Whale Impact, Token Trends',
  description: 'Stay updated with curated crypto news aligned to market moves and whale activity.',
  alternates: { canonical: 'https://www.sonartracker.io/news' },
}

export default function NewsPage() {
  return (
    <AuthGuard>
      <News />
    </AuthGuard>
  )
}
