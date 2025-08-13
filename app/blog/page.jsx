import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Blog — Whale Tracking Guides & Crypto Insights',
  description: 'Guides and insights about whale tracking, copy trading, and on‑chain analytics.',
  alternates: { canonical: 'https://www.sonartracker.io/blog' },
}

const posts = [
  { slug: 'what-is-whale-tracking', title: 'What is Whale Tracking? How It Works and Why It Matters', summary: 'Learn how whale tracking reveals large on‑chain moves and how traders use it for edge.' },
  { slug: 'copy-whale-trades', title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)', summary: 'A practical framework to follow whales while managing risk and slippage.' },
  { slug: 'real-time-crypto-transactions', title: 'Real‑Time Crypto Transactions Explained', summary: 'From mempools to settlement, how data flows into live dashboards and alerts.' },
]

export default function BlogIndex() {
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1>Blog</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(p => (
          <li key={p.slug} style={{ margin: '1rem 0' }}>
            <h2 style={{ margin: 0 }}><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{p.summary}</p>
          </li>
        ))}
      </ul>
    </main>
  )
} 