import React from 'react'
import BlogClient from './BlogClient'

export const metadata = {
  title: 'Blog — Whale Tracking Guides & Crypto Insights',
  description: 'Guides and insights about whale tracking, copy trading, and on‑chain analytics.',
  alternates: { canonical: 'https://www.sonartracker.io/blog' },
}

export default function BlogIndex() {
  return <BlogClient />
} 