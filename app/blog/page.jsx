import React, { Suspense } from 'react'
import BlogClient from './BlogClient'

export const metadata = {
  title: 'Blog — Whale Tracking Guides & Crypto Insights',
  description: 'Guides and insights about whale tracking, copy trading, and on‑chain analytics.',
  alternates: { canonical: 'https://www.sonartracker.io/blog' },
}

function BlogLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'var(--background-dark)',
      color: 'var(--text-primary)'
    }}>
      <div>Loading blog...</div>
    </div>
  )
}

export default function BlogIndex() {
  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogClient />
    </Suspense>
  )
} 